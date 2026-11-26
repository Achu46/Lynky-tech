import 'dotenv/config';
import { getPool, closePool } from '@pocket-operator/shared';

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: npm run export-trace -- <run_id>');
    process.exit(1);
  }

  const pool = getPool();
  try {
    const runRes = await pool.query('SELECT * FROM assistant_runs WHERE id = $1', [runId]);
    if (runRes.rows.length === 0) {
      console.error(`Run not found: ${runId}`);
      process.exit(1);
    }

    const stepsRes = await pool.query(
      'SELECT * FROM assistant_steps WHERE run_id = $1 ORDER BY step_number ASC',
      [runId]
    );

    const proposalsRes = await pool.query(
      'SELECT * FROM order_proposals WHERE run_id = $1 ORDER BY created_at ASC',
      [runId]
    );

    const trace = {
      run: runRes.rows[0],
      steps: stepsRes.rows,
      proposals: proposalsRes.rows
    };

    console.log(JSON.stringify(trace, null, 2));
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error('Failed to export trace:', err.message);
  process.exit(1);
});
