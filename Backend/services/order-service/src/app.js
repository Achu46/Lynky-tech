import express from 'express';
import { z } from 'zod';
import {
  getPool,
  withTransaction,
  createLogger,
  requireInternalKey,
  parseWithSchema,
  asyncHandler,
  serviceFetch,
  serviceFetchOrThrow,
  NotFoundError,
  ConflictError,
  ValidationError,
  errorHandler
} from '@pocket-operator/shared';

const uuidSchema = z.string().uuid();

const createProposalSchema = z.object({
  run_id: z.string().uuid(),
  dish_id: z.string().min(1),
  max_price: z.number().min(0),
  vegetarian: z.boolean(),
  wants_directions: z.boolean().optional().default(false)
});

const directionsResultSchema = z.object({
  outcome: z.enum(['maps_opened', 'browser_fallback_opened', 'could_not_open'])
});

function formatProposal(row) {
  return {
    id: row.id,
    run_id: row.run_id,
    dish_id: row.dish_id,
    restaurant_id: row.restaurant_id,
    dish_name: row.dish_name ?? null,
    restaurant_name: row.restaurant_name ?? null,
    quantity: Number(row.quantity),
    price: Number(row.price),
    max_price: Number(row.max_price),
    vegetarian: Boolean(row.vegetarian),
    wants_directions: Boolean(row.wants_directions),
    status: row.status,
    replaces_proposal_id: row.replaces_proposal_id,
    created_at: row.created_at,
    resolved_at: row.resolved_at
  };
}

function formatOrder(row) {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    idempotency_key: row.idempotency_key,
    dish_id: row.dish_id,
    restaurant_id: row.restaurant_id,
    dish_name: row.dish_name,
    restaurant_name: row.restaurant_name,
    quantity: Number(row.quantity),
    total: Number(row.total),
    label: row.label,
    status: row.status,
    directions_status: row.directions_status,
    created_at: row.created_at
  };
}

function buildDeviceAction(order, restaurant) {
  return {
    type: 'open_maps',
    latitude: Number(restaurant.latitude),
    longitude: Number(restaurant.longitude),
    label: restaurant.name || order.restaurant_name,
    order_id: order.id
  };
}

export function createOrderApp({
  pool = getPool(),
  logger = createLogger('order-service'),
  catalogUrl = () => process.env.CATALOG_URL || 'http://127.0.0.1:3001'
} = {}) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const getCatalogUrl = () => (typeof catalogUrl === 'function' ? catalogUrl() : catalogUrl);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'order-service' });
  });

  app.use(requireInternalKey());

  app.post(
    '/proposals',
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createProposalSchema, req.body, 'proposal');

      // Retry idempotency: if this run_id already has a matching pending proposal, return it.
      // If constraints/dish changed (e.g. user changed veg -> non-veg on retry/follow-up), cancel the old pending one first.
      const existing = await pool.query(
        `SELECT * FROM order_proposals WHERE run_id = $1 AND status = 'pending' LIMIT 1`,
        [body.run_id]
      );
      if (existing.rows.length > 0) {
        const prevProp = existing.rows[0];
        if (
          prevProp.dish_id === body.dish_id &&
          Number(prevProp.max_price) === body.max_price &&
          Boolean(prevProp.vegetarian) === body.vegetarian &&
          Boolean(prevProp.wants_directions) === body.wants_directions
        ) {
          return res.status(200).json(formatProposal(prevProp));
        }
        await pool.query(
          `UPDATE order_proposals SET status = 'cancelled', resolved_at = now() WHERE id = $1`,
          [prevProp.id]
        );
      }

      const base = getCatalogUrl();
      const dishRes = await serviceFetch(base, `/dishes/${encodeURIComponent(body.dish_id)}`);
      if (dishRes.status === 404) {
        throw new NotFoundError('Dish not found', 'DISH_NOT_FOUND');
      }
      if (!dishRes.ok) {
        throw new ConflictError('CATALOG_ERROR', dishRes.data?.message || 'Catalog lookup failed');
      }
      const dish = dishRes.data;

      if (!dish.is_available) {
        throw new ConflictError('DISH_UNAVAILABLE', `Dish ${dish.id} is currently unavailable`);
      }
      if (Number(dish.price) > body.max_price) {
        throw new ValidationError(`Dish ${dish.id} price (${dish.price}) exceeds budget (${body.max_price})`);
      }
      if (Boolean(dish.is_vegetarian) !== body.vegetarian) {
        throw new ValidationError(
          `Dish ${dish.id} does not match vegetarian=${body.vegetarian} requirement`
        );
      }

      const searchData = await serviceFetchOrThrow(
        base,
        `/dishes/search?max_price=${encodeURIComponent(body.max_price)}&vegetarian=${encodeURIComponent(body.vegetarian)}`
      );
      const validDishes = searchData.dishes || [];
      if (validDishes.length === 0 || validDishes[0].id !== dish.id) {
        throw new ConflictError(
          'NOT_CHEAPEST_OPTION',
          `Dish ${dish.id} is not the cheapest valid choice`,
          { cheapest_dish: validDishes[0] || null }
        );
      }

      try {
        const { rows } = await pool.query(
          `INSERT INTO order_proposals
             (run_id, dish_id, restaurant_id, dish_name, restaurant_name, quantity, price, max_price, vegetarian, wants_directions, status)
           VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, 'pending')
           RETURNING *`,
          [
            body.run_id,
            dish.id,
            dish.restaurant_id,
            dish.name,
            dish.restaurant_name,
            dish.price,
            body.max_price,
            body.vegetarian,
            body.wants_directions
          ]
        );
        logger.info('Created proposal', { proposal_id: rows[0].id, dish_id: dish.id, run_id: body.run_id });
        return res.status(201).json(formatProposal(rows[0]));
      } catch (err) {
        if (err.code === '23505') {
          const retry = await pool.query(
            `SELECT * FROM order_proposals WHERE run_id = $1 AND status = 'pending' LIMIT 1`,
            [body.run_id]
          );
          if (retry.rows.length > 0) {
            return res.status(200).json(formatProposal(retry.rows[0]));
          }
        }
        throw err;
      }
    })
  );

  app.get(
    '/proposals/:id',
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(uuidSchema, req.params.id, 'proposal id');
      const { rows } = await pool.query('SELECT * FROM order_proposals WHERE id = $1', [id]);
      if (rows.length === 0) {
        throw new NotFoundError('Proposal not found', 'PROPOSAL_NOT_FOUND');
      }
      res.json(formatProposal(rows[0]));
    })
  );

  app.post(
    '/proposals/:id/cancel',
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(uuidSchema, req.params.id, 'proposal id');

      const proposal = await withTransaction(pool, async (client) => {
        const { rows } = await client.query(
          'SELECT * FROM order_proposals WHERE id = $1 FOR UPDATE',
          [id]
        );
        if (rows.length === 0) {
          throw new NotFoundError('Proposal not found', 'PROPOSAL_NOT_FOUND');
        }
        const current = rows[0];
        if (current.status === 'cancelled') {
          return current;
        }
        if (current.status !== 'pending') {
          throw new ConflictError(
            'CANNOT_CANCEL_PROPOSAL',
            `Cannot cancel proposal in status ${current.status}`
          );
        }
        const updated = await client.query(
          `UPDATE order_proposals
           SET status = 'cancelled', resolved_at = now()
           WHERE id = $1
           RETURNING *`,
          [id]
        );
        return updated.rows[0];
      });

      res.json(formatProposal(proposal));
    })
  );

  app.post(
    '/proposals/:id/confirm',
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(uuidSchema, req.params.id, 'proposal id');
      const idempotencyKey = req.get('Idempotency-Key')?.trim();
      if (!idempotencyKey) {
        throw new ValidationError('Idempotency-Key header is required');
      }

      const base = getCatalogUrl();

      const outcome = await withTransaction(pool, async (client) => {
        const propRes = await client.query(
          'SELECT * FROM order_proposals WHERE id = $1 FOR UPDATE',
          [id]
        );
        const proposal = propRes.rows[0] || null;

        // Step 3: Check if order already exists for this proposal or idempotency key
        const existingOrderRes = await client.query(
          'SELECT * FROM orders WHERE proposal_id = $1 OR idempotency_key = $2 LIMIT 1',
          [id, idempotencyKey]
        );
        if (existingOrderRes.rows.length > 0) {
          return {
            kind: 'existing_order',
            order: existingOrderRes.rows[0],
            wantsDirections: proposal ? Boolean(proposal.wants_directions) : false
          };
        }

        // Step 4: Must have a pending proposal
        if (!proposal || proposal.status !== 'pending') {
          return { kind: 'no_valid_proposal' };
        }

        // Step 5: Fetch fresh dish from catalog-service
        const freshRes = await serviceFetch(base, `/dishes/${encodeURIComponent(proposal.dish_id)}`);
        const freshDish = freshRes.ok ? freshRes.data : null;

        const priceChanged = freshDish && Number(freshDish.price) !== Number(proposal.price);
        const unavailable = !freshDish || !freshDish.is_available;

        if (unavailable || priceChanged) {
          const reason = unavailable ? 'DISH_UNAVAILABLE' : 'PRICE_CHANGED';

          await client.query(
            `UPDATE order_proposals
             SET status = 'stale', resolved_at = now()
             WHERE id = $1`,
            [proposal.id]
          );

          const searchData = await serviceFetchOrThrow(
            base,
            `/dishes/search?max_price=${encodeURIComponent(Number(proposal.max_price))}&vegetarian=${encodeURIComponent(Boolean(proposal.vegetarian))}`
          );
          const nextDish = (searchData.dishes || [])[0] || null;

          let newProposal = null;
          if (nextDish) {
            const ins = await client.query(
              `INSERT INTO order_proposals
                 (run_id, dish_id, restaurant_id, dish_name, restaurant_name, quantity, price, max_price, vegetarian, wants_directions, status, replaces_proposal_id)
               VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, 'pending', $10)
               RETURNING *`,
              [
                proposal.run_id,
                nextDish.id,
                nextDish.restaurant_id,
                nextDish.name,
                nextDish.restaurant_name,
                nextDish.price,
                proposal.max_price,
                proposal.vegetarian,
                proposal.wants_directions,
                proposal.id
              ]
            );
            newProposal = formatProposal(ins.rows[0]);
          }

          return {
            kind: 'stale',
            reason,
            newProposal,
            message: newProposal
              ? `${unavailable ? 'The selected dish became unavailable' : 'The dish price changed'}. A new proposal for ${nextDish.name} at Rs ${nextDish.price} has been prepared for your approval.`
              : `${unavailable ? 'The selected dish became unavailable' : 'The dish price changed'} and no matching dishes remain within your budget.`
          };
        }

        // Step 6: Insert order with SAVEPOINT to catch unique_violation cleanly
        await client.query('SAVEPOINT before_order_insert');
        try {
          const orderRes = await client.query(
            `INSERT INTO orders
               (proposal_id, idempotency_key, dish_id, restaurant_id, dish_name, restaurant_name, quantity, total, label, status)
             VALUES ($1, $2, $3, $4, $5, $6, 1, $7, 'SANDBOX', 'sandbox_saved')
             RETURNING *`,
            [
              proposal.id,
              idempotencyKey,
              freshDish.id,
              freshDish.restaurant_id,
              freshDish.name,
              freshDish.restaurant_name,
              proposal.price
            ]
          );
          await client.query(
            `UPDATE order_proposals
             SET status = 'confirmed', resolved_at = now()
             WHERE id = $1`,
            [proposal.id]
          );
          return {
            kind: 'created',
            order: orderRes.rows[0],
            freshDish,
            wantsDirections: Boolean(proposal.wants_directions)
          };
        } catch (err) {
          if (err.code === '23505') {
            await client.query('ROLLBACK TO SAVEPOINT before_order_insert');
            const dupRes = await client.query(
              'SELECT * FROM orders WHERE proposal_id = $1 OR idempotency_key = $2 LIMIT 1',
              [id, idempotencyKey]
            );
            if (dupRes.rows.length > 0) {
              return {
                kind: 'existing_order',
                order: dupRes.rows[0],
                wantsDirections: Boolean(proposal.wants_directions)
              };
            }
          }
          throw err;
        }
      });

      if (outcome.kind === 'no_valid_proposal') {
        throw new ConflictError('NO_VALID_PROPOSAL', 'No valid pending proposal found to confirm');
      }

      if (outcome.kind === 'stale') {
        return res.status(409).json({
          error: 'STALE_PROPOSAL',
          reason: outcome.reason,
          new_proposal: outcome.newProposal,
          message: outcome.message
        });
      }

      const formattedOrder = formatOrder(outcome.order);
      const response = { order: formattedOrder };

      if (outcome.wantsDirections) {
        let restaurant = outcome.freshDish
          ? {
              name: outcome.freshDish.restaurant_name,
              latitude: outcome.freshDish.latitude,
              longitude: outcome.freshDish.longitude
            }
          : null;

        if (!restaurant) {
          const restRes = await serviceFetch(
            base,
            `/restaurants/${encodeURIComponent(formattedOrder.restaurant_id)}`
          );
          if (restRes.ok) {
            restaurant = restRes.data;
          }
        }

        if (restaurant) {
          response.device_action = buildDeviceAction(formattedOrder, restaurant);
        }
      }

      logger.info('Confirmed order', {
        order_id: formattedOrder.id,
        proposal_id: formattedOrder.proposal_id,
        reused: outcome.kind === 'existing_order'
      });

      return res.status(200).json(response);
    })
  );

  app.get(
    '/orders',
    asyncHandler(async (_req, res) => {
      const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      res.json({ orders: rows.map(formatOrder) });
    })
  );

  app.get(
    '/orders/last',
    asyncHandler(async (_req, res) => {
      const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1');
      if (rows.length === 0) {
        throw new NotFoundError('No orders found', 'ORDER_NOT_FOUND');
      }
      res.json({ order: formatOrder(rows[0]) });
    })
  );

  app.post(
    '/orders/:id/directions-result',
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(uuidSchema, req.params.id, 'order id');
      const body = parseWithSchema(directionsResultSchema, req.body, 'directions result');

      const { rows } = await pool.query(
        `UPDATE orders SET directions_status = $1 WHERE id = $2 RETURNING *`,
        [body.outcome, id]
      );
      if (rows.length === 0) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }
      res.json({ order: formatOrder(rows[0]) });
    })
  );

  app.post(
    '/reset',
    asyncHandler(async (_req, res) => {
      await pool.query('TRUNCATE TABLE orders, order_proposals');
      logger.info('Reset order-service tables');
      res.json({ ok: true });
    })
  );

  app.use(errorHandler(logger));
  return app;
}
