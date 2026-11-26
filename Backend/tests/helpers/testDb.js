import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import pg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import { runMigrations } from '../../database/migrate.js';
import { seedCatalog } from '../../database/seed.js';

const { Pool } = pg;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

export async function startTestDatabase({ dataDir, persistent = false } = {}) {
  if (process.env.DATABASE_URL && process.env.FORCE_EMBEDDED_PG !== 'true' && !dataDir) {
    const pools = [];
    const createPool = (max = 20) => {
      const p = new Pool({ connectionString: process.env.DATABASE_URL, max });
      pools.push(p);
      return p;
    };
    const pool = createPool(20);
    await runMigrations(pool);
    await seedCatalog(pool);
    return {
      connectionString: process.env.DATABASE_URL,
      pool,
      createPool,
      stop: async () => {
        await Promise.all(pools.map((p) => p.end().catch(() => {})));
      }
    };
  }

  const port = await getFreePort();
  const dir = dataDir || (await fs.mkdtemp(path.join(os.tmpdir(), 'pocket-op-pg-')));
  const db = new EmbeddedPostgres({
    databaseDir: dir,
    user: 'postgres',
    password: 'password',
    port,
    persistent
  });

  await db.initialise();
  await db.start();
  await db.createDatabase('pocket_operator');

  const connectionString = `postgres://postgres:password@127.0.0.1:${port}/pocket_operator`;
  const pools = [];
  const createPool = (max = 20) => {
    const p = new Pool({ connectionString, max });
    pools.push(p);
    return p;
  };
  const pool = createPool(20);
  await runMigrations(pool);
  await seedCatalog(pool);

  return {
    connectionString,
    pool,
    createPool,
    dataDir: dir,
    port,
    stop: async () => {
      await Promise.all(pools.map((p) => p.end().catch(() => {})));
      await db.stop().catch(() => {});
      if (!persistent && !dataDir) {
        await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    }
  };
}

export async function restartTestDatabase(dataDir) {
  const port = await getFreePort();
  const db = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'password',
    port,
    persistent: true
  });
  await db.start();
  const connectionString = `postgres://postgres:password@127.0.0.1:${port}/pocket_operator`;
  const pool = new Pool({ connectionString });
  return {
    connectionString,
    pool,
    stop: async () => {
      await pool.end().catch(() => {});
      await db.stop().catch(() => {});
    }
  };
}

export function startAppServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res))
      });
    });
    server.on('error', reject);
  });
}
