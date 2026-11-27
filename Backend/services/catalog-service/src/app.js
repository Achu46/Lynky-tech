import express from 'express';
import { z } from 'zod';
import {
  getPool,
  createLogger,
  requireInternalKey,
  parseWithSchema,
  asyncHandler,
  NotFoundError,
  ValidationError,
  errorHandler
} from '@pocket-operator/shared';
import { seedCatalog } from '../../../database/seed.js';

const parseOptionalBoolean = (v) => {
  if (v === undefined || v === '') return undefined;
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return v;
};

const searchQuerySchema = z.object({
  max_price: z.preprocess(
    (v) => (v === undefined || v === '' ? undefined : Number(v)),
    z.number().min(0).optional()
  ),
  vegetarian: z.preprocess(parseOptionalBoolean, z.boolean().optional()),
  include_unavailable: z.preprocess(parseOptionalBoolean, z.boolean().optional())
});

const patchDishSchema = z
  .object({
    available: z.boolean().optional(),
    price: z.number().min(0).optional()
  })
  .refine((d) => d.available !== undefined || d.price !== undefined, {
    message: 'At least one of available or price must be provided'
  });

function formatDish(row) {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    restaurant_name: row.restaurant_name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    name: row.name,
    is_vegetarian: Boolean(row.is_vegetarian),
    price: Number(row.price),
    is_available: Boolean(row.is_available),
    description: row.description,
    updated_at: row.updated_at
  };
}

export function createCatalogApp({ pool = getPool(), logger = createLogger('catalog-service') } = {}) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'catalog-service' });
  });

  app.use(requireInternalKey());

  app.get(
    '/restaurants/:id',
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        'SELECT id, name, latitude, longitude FROM restaurants WHERE id = $1',
        [req.params.id]
      );
      if (rows.length === 0) {
        throw new NotFoundError('Restaurant not found', 'RESTAURANT_NOT_FOUND');
      }
      const r = rows[0];
      res.json({
        id: r.id,
        name: r.name,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude)
      });
    })
  );

  app.get(
    '/dishes/search',
    asyncHandler(async (req, res) => {
      const query = parseWithSchema(searchQuerySchema, req.query, 'search query');

      const conditions = [];
      if (!query.include_unavailable) {
        conditions.push('d.is_available = true');
      }
      const params = [];

      if (query.max_price !== undefined) {
        if (Number.isNaN(query.max_price)) {
          throw new ValidationError('Invalid max_price');
        }
        params.push(query.max_price);
        conditions.push(`d.price <= $${params.length}`);
      }

      if (query.vegetarian !== undefined) {
        params.push(query.vegetarian);
        conditions.push(`d.is_vegetarian = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT d.*, r.name AS restaurant_name, r.latitude, r.longitude
        FROM dishes d
        JOIN restaurants r ON r.id = d.restaurant_id
        ${whereClause}
        ORDER BY d.price ASC, d.id ASC
      `;

      const { rows } = await pool.query(sql, params);
      res.json({ dishes: rows.map(formatDish) });
    })
  );

  app.get(
    '/dishes/:id',
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT d.*, r.name AS restaurant_name, r.latitude, r.longitude
         FROM dishes d
         JOIN restaurants r ON r.id = d.restaurant_id
         WHERE d.id = $1`,
        [req.params.id]
      );
      if (rows.length === 0) {
        throw new NotFoundError('Dish not found', 'DISH_NOT_FOUND');
      }
      res.json(formatDish(rows[0]));
    })
  );

  app.patch(
    '/dishes/:id',
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(patchDishSchema, req.body, 'dish update');

      const sets = ['updated_at = now()'];
      const params = [];

      if (body.available !== undefined) {
        params.push(body.available);
        sets.push(`is_available = $${params.length}`);
      }
      if (body.price !== undefined) {
        params.push(body.price);
        sets.push(`price = $${params.length}`);
      }

      params.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE dishes
         SET ${sets.join(', ')}
         WHERE id = $${params.length}
         RETURNING id`,
        params
      );

      if (rows.length === 0) {
        throw new NotFoundError('Dish not found', 'DISH_NOT_FOUND');
      }

      const full = await pool.query(
        `SELECT d.*, r.name AS restaurant_name, r.latitude, r.longitude
         FROM dishes d
         JOIN restaurants r ON r.id = d.restaurant_id
         WHERE d.id = $1`,
        [req.params.id]
      );
      logger.info('Updated dish', { dish_id: req.params.id, ...body });
      res.json(formatDish(full.rows[0]));
    })
  );

  app.post(
    '/reseed',
    asyncHandler(async (_req, res) => {
      const counts = await seedCatalog(pool);
      logger.info('Reseeded catalog', counts);
      res.json({ ok: true, ...counts });
    })
  );

  app.use(errorHandler(logger));
  return app;
}
