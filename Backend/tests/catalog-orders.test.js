import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { startTestDatabase, startAppServer } from './helpers/testDb.js';
import { createCatalogApp } from '../services/catalog-service/src/app.js';
import { createOrderApp } from '../services/order-service/src/app.js';
import { seedCatalog } from '../database/seed.js';

describe('Catalog & Order Service (Tests 1-6)', () => {
  let db;
  let catalogApp;
  let catalogServer;
  let orderApp;
  const internalKey = 'test-internal-key';

  beforeAll(async () => {
    process.env.INTERNAL_KEY = internalKey;
    db = await startTestDatabase();
    catalogApp = createCatalogApp({ pool: db.createPool() });
    catalogServer = await startAppServer(catalogApp);
    orderApp = createOrderApp({ pool: db.createPool(), catalogUrl: catalogServer.url });
  });

  afterAll(async () => {
    await catalogServer?.close();
    await db?.stop();
  });

  beforeEach(async () => {
    await seedCatalog(db.pool);
    await db.pool.query('TRUNCATE TABLE orders, order_proposals');
  });

  // Test 6: Selection logic
  it('6. Selection logic: inclusive budget, tie by id, unavailable skipped, veg filter, nothing matches', async () => {
    // Vegetarian <= 200: m3 (120, unavailable) skipped; m4 (160) wins over m1 (180)
    const vegRes = await request(catalogApp)
      .get('/dishes/search?max_price=200&vegetarian=true')
      .set('x-internal-key', internalKey);
    expect(vegRes.status).toBe(200);
    expect(vegRes.body.dishes.map((d) => d.id)).toEqual(['m4', 'm1']);
    expect(vegRes.body.dishes[0].price).toBe(160);

    // Inclusive budget: exact price 160 includes m4
    const exactRes = await request(catalogApp)
      .get('/dishes/search?max_price=160&vegetarian=true')
      .set('x-internal-key', internalKey);
    expect(exactRes.status).toBe(200);
    expect(exactRes.body.dishes.map((d) => d.id)).toEqual(['m4']);

    // Make m4 unavailable and tie m2 at 180 -> tie between m1 and m2 -> lowest id m1 wins
    await request(catalogApp)
      .patch('/dishes/m4')
      .set('x-internal-key', internalKey)
      .send({ available: false });
    await request(catalogApp)
      .patch('/dishes/m2')
      .set('x-internal-key', internalKey)
      .send({ price: 180 });

    const tieRes = await request(catalogApp)
      .get('/dishes/search?max_price=200&vegetarian=true')
      .set('x-internal-key', internalKey);
    expect(tieRes.status).toBe(200);
    expect(tieRes.body.dishes[0].id).toBe('m1');
    expect(tieRes.body.dishes[1].id).toBe('m2');

    // Non-veg filter: m5 Chicken Rice Bowl (190)
    const nonVegRes = await request(catalogApp)
      .get('/dishes/search?max_price=200&vegetarian=false')
      .set('x-internal-key', internalKey);
    expect(nonVegRes.status).toBe(200);
    expect(nonVegRes.body.dishes.map((d) => d.id)).toEqual(['m5']);

    // Nothing matches
    const emptyRes = await request(catalogApp)
      .get('/dishes/search?max_price=50&vegetarian=true')
      .set('x-internal-key', internalKey);
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.dishes).toEqual([]);
  });

  // Test 1: Confirm without a valid pending proposal -> 409, no order
  it('1. Confirm without a valid pending proposal returns 409 and creates no order', async () => {
    const fakeId = crypto.randomUUID();
    const res = await request(orderApp)
      .post(`/proposals/${fakeId}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'key-1');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('NO_VALID_PROPOSAL');

    const orders = await db.pool.query('SELECT * FROM orders');
    expect(orders.rowCount).toBe(0);
  });

  // Test 2: Cancel leaves zero orders
  it('2. Cancel marks proposal cancelled, leaves zero orders, and cannot confirm afterwards', async () => {
    const runId = crypto.randomUUID();
    const propRes = await request(orderApp)
      .post('/proposals')
      .set('x-internal-key', internalKey)
      .send({
        run_id: runId,
        dish_id: 'm4',
        max_price: 200,
        vegetarian: true,
        wants_directions: false
      });
    expect(propRes.status).toBe(201);

    const cancelRes = await request(orderApp)
      .post(`/proposals/${propRes.body.id}/cancel`)
      .set('x-internal-key', internalKey);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('cancelled');

    const confirmRes = await request(orderApp)
      .post(`/proposals/${propRes.body.id}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'after-cancel');
    expect(confirmRes.status).toBe(409);
    expect(confirmRes.body.error).toBe('NO_VALID_PROPOSAL');

    const orders = await db.pool.query('SELECT * FROM orders');
    expect(orders.rowCount).toBe(0);
  });

  // Test 3: Stale proposal handling
  it('3. Stale: price or availability change -> 409 STALE_PROPOSAL with new_proposal or null, no order', async () => {
    const runId = crypto.randomUUID();
    const propRes = await request(orderApp)
      .post('/proposals')
      .set('x-internal-key', internalKey)
      .send({
        run_id: runId,
        dish_id: 'm4',
        max_price: 200,
        vegetarian: true,
        wants_directions: true
      });
    expect(propRes.status).toBe(201);

    // Make m4 unavailable -> confirm should mark stale and propose m1 (180)
    await request(catalogApp)
      .patch('/dishes/m4')
      .set('x-internal-key', internalKey)
      .send({ available: false });

    const confirm1 = await request(orderApp)
      .post(`/proposals/${propRes.body.id}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'stale-1');

    expect(confirm1.status).toBe(409);
    expect(confirm1.body.error).toBe('STALE_PROPOSAL');
    expect(confirm1.body.new_proposal).toBeTruthy();
    expect(confirm1.body.new_proposal.dish_id).toBe('m1');
    expect(confirm1.body.new_proposal.price).toBe(180);
    expect(confirm1.body.new_proposal.replaces_proposal_id).toBe(propRes.body.id);

    // Price change on m1 above budget (250 > 200); m2 (220) and m6 (280) are already > 200 -> new_proposal null
    await request(catalogApp)
      .patch('/dishes/m1')
      .set('x-internal-key', internalKey)
      .send({ price: 250 });

    const confirm2 = await request(orderApp)
      .post(`/proposals/${confirm1.body.new_proposal.id}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'stale-2');

    expect(confirm2.status).toBe(409);
    expect(confirm2.body.error).toBe('STALE_PROPOSAL');
    expect(confirm2.body.new_proposal).toBeNull();

    const orders = await db.pool.query('SELECT * FROM orders');
    expect(orders.rowCount).toBe(0);
  });

  // Test 4: 10 parallel confirms (same key and different keys) -> 1 order
  it('4. 10 parallel confirms (same key and different keys) produce exactly 1 order with same order id', async () => {
    const runId = crypto.randomUUID();
    const propRes = await request(orderApp)
      .post('/proposals')
      .set('x-internal-key', internalKey)
      .send({
        run_id: runId,
        dish_id: 'm4',
        max_price: 200,
        vegetarian: true,
        wants_directions: true
      });
    expect(propRes.status).toBe(201);
    const proposalId = propRes.body.id;

    // 5 with the same key, 5 with distinct keys — all 10 in parallel
    const requests = Array.from({ length: 10 }, (_, idx) => {
      const key = idx < 5 ? 'shared-key' : `unique-key-${idx}`;
      return request(orderApp)
        .post(`/proposals/${proposalId}/confirm`)
        .set('x-internal-key', internalKey)
        .set('Idempotency-Key', key);
    });

    const responses = await Promise.all(requests);
    for (const r of responses) {
      expect(r.status).toBe(200);
      expect(r.body.order).toBeTruthy();
      expect(r.body.device_action).toMatchObject({
        type: 'open_maps',
        order_id: r.body.order.id
      });
    }

    const uniqueOrderIds = new Set(responses.map((r) => r.body.order.id));
    expect(uniqueOrderIds.size).toBe(1);

    const dbOrders = await db.pool.query('SELECT * FROM orders');
    expect(dbOrders.rowCount).toBe(1);
    expect(dbOrders.rows[0].total).toBe('160.00');
  });

  // Test 5: Retry with the same Idempotency-Key returns the same order
  it('5. Retry with same Idempotency-Key returns the exact same order', async () => {
    const runId = crypto.randomUUID();
    const propRes = await request(orderApp)
      .post('/proposals')
      .set('x-internal-key', internalKey)
      .send({
        run_id: runId,
        dish_id: 'm4',
        max_price: 200,
        vegetarian: true,
        wants_directions: false
      });
    expect(propRes.status).toBe(201);

    const first = await request(orderApp)
      .post(`/proposals/${propRes.body.id}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'idem-retry-123');
    expect(first.status).toBe(200);

    const retry = await request(orderApp)
      .post(`/proposals/${propRes.body.id}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'idem-retry-123');
    expect(retry.status).toBe(200);
    expect(retry.body.order.id).toBe(first.body.order.id);

    const dbOrders = await db.pool.query('SELECT * FROM orders');
    expect(dbOrders.rowCount).toBe(1);
  });
});
