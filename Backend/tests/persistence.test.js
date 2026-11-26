import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import request from 'supertest';
import { startTestDatabase, restartTestDatabase, startAppServer } from './helpers/testDb.js';
import { createCatalogApp } from '../services/catalog-service/src/app.js';
import { createOrderApp } from '../services/order-service/src/app.js';

describe('Persistence across restart (Test 8)', () => {
  let persistentDir;
  let dbInstance;

  afterAll(async () => {
    await dbInstance?.stop().catch(() => {});
    if (persistentDir) {
      await fs.rm(persistentDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('8. Data survives a full DB and service restart', async () => {
    const internalKey = 'persist-test-key';
    process.env.INTERNAL_KEY = internalKey;
    persistentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pocket-op-persist-'));

    // First boot: create proposal + confirm order
    dbInstance = await startTestDatabase({ dataDir: persistentDir, persistent: true });
    let catalogServer = await startAppServer(createCatalogApp({ pool: dbInstance.pool }));
    let orderApp = createOrderApp({ pool: dbInstance.pool, catalogUrl: catalogServer.url });

    const propRes = await request(orderApp)
      .post('/proposals')
      .set('x-internal-key', internalKey)
      .send({
        run_id: crypto.randomUUID(),
        dish_id: 'm4',
        max_price: 200,
        vegetarian: true,
        wants_directions: false
      });
    expect(propRes.status).toBe(201);

    const confirmRes = await request(orderApp)
      .post(`/proposals/${propRes.body.id}/confirm`)
      .set('x-internal-key', internalKey)
      .set('Idempotency-Key', 'persist-key-1');
    expect(confirmRes.status).toBe(200);
    const savedOrderId = confirmRes.body.order.id;

    // Shut down services AND Postgres
    await catalogServer.close();
    await dbInstance.stop();
    dbInstance = null;

    // Second boot: start Postgres on the same data directory and fresh service instances
    dbInstance = await restartTestDatabase(persistentDir);
    catalogServer = await startAppServer(createCatalogApp({ pool: dbInstance.pool }));
    orderApp = createOrderApp({ pool: dbInstance.pool, catalogUrl: catalogServer.url });

    const lastRes = await request(orderApp)
      .get('/orders/last')
      .set('x-internal-key', internalKey);

    expect(lastRes.status).toBe(200);
    expect(lastRes.body.order.id).toBe(savedOrderId);
    expect(lastRes.body.order.dish_id).toBe('m4');
    expect(lastRes.body.order.total).toBe(160);

    await catalogServer.close();
  });
});
