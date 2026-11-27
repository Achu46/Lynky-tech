import pg from 'pg';

const { Pool } = pg;

let poolInstance = null;
let currentConnectionString = null;

export function getPool(connectionString = process.env.DATABASE_URL) {
  const target = connectionString || 'postgres://postgres:postgres@localhost:5432/pocket_operator';
  if (!poolInstance || currentConnectionString !== target) {
    if (poolInstance) {
      poolInstance.end().catch(() => {});
    }
    currentConnectionString = target;
    poolInstance = new Pool({
      connectionString: target,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    poolInstance.on('error', () => {});
  }
  return poolInstance;
}

export function setPool(pool) {
  poolInstance = pool;
}

export async function closePool() {
  if (poolInstance) {
    const p = poolInstance;
    poolInstance = null;
    currentConnectionString = null;
    await p.end();
  }
}

export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
