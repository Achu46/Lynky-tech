import express from 'express';
import crypto from 'node:crypto';
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
import { GeminiLlmClient } from './llm.js';
import { runAgentLoop } from './agent.js';

const uuidSchema = z.string().uuid();

const agentRunSchema = z
  .object({
    session_id: z.string().min(1).max(200),
    text: z.string().min(1).max(2000),
    run_id: z.string().uuid().optional()
  })
  .strict();

export function createAssistantApp({
  pool = getPool(),
  logger = createLogger('assistant-service'),
  llmClient = new GeminiLlmClient(),
  catalogUrl = () => process.env.CATALOG_URL || 'http://127.0.0.1:3001',
  orderUrl = () => process.env.ORDER_URL || 'http://127.0.0.1:3002'
} = {}) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const getCatalogUrl = () => (typeof catalogUrl === 'function' ? catalogUrl() : catalogUrl);
  const getOrderUrl = () => (typeof orderUrl === 'function' ? orderUrl() : orderUrl);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'assistant-service' });
  });

  app.use(requireInternalKey());

  app.post(
    '/agent/run',
    asyncHandler(async (req, res) => {
      if (req.body && ('audio' in req.body || 'audio_base64' in req.body)) {
        throw new ValidationError('Raw audio is not accepted; send transcribed text only');
      }
      const body = parseWithSchema(agentRunSchema, req.body, 'agent run');
      const runId = body.run_id || crypto.randomUUID();

      let priorFollowUp = null;
      const existing = await pool.query('SELECT * FROM assistant_runs WHERE id = $1', [runId]);
      if (existing.rows.length > 0) {
        const prev = existing.rows[0];
        if (prev.status !== 'failed' && prev.status !== 'needs_answer') {
          const stepsRes = await pool.query(
            `SELECT step_number, tool_name, outcome, short_note, started_at, finished_at
             FROM assistant_steps WHERE run_id = $1 ORDER BY step_number ASC`,
            [runId]
          );
          return res.json({
            run_id: runId,
            status: prev.status,
            assistant_message: prev.reply_text || '',
            activity: stepsRes.rows
          });
        }

        if (prev.status === 'needs_answer') {
          priorFollowUp = {
            previousUserMessage: prev.user_message,
            previousAssistantReply: prev.reply_text || ''
          };
          await pool.query(
            `UPDATE assistant_runs
             SET status = 'running', user_message = $1, error_code = null, finished_at = null
             WHERE id = $2`,
            [`${prev.user_message}\n${body.text}`, runId]
          );
        } else {
          await pool.query(
            `UPDATE assistant_runs
             SET status = 'running', error_code = null, finished_at = null
             WHERE id = $1`,
            [runId]
          );
        }
      } else {
        await pool.query(
          `INSERT INTO assistant_runs (id, session_id, user_message, status)
           VALUES ($1, $2, $3, 'running')`,
          [runId, body.session_id, body.text]
        );
      }

      const result = await runAgentLoop({
        pool,
        llmClient,
        catalogUrl: getCatalogUrl(),
        orderUrl: getOrderUrl(),
        logger,
        runId,
        sessionId: body.session_id,
        userMessage: body.text,
        priorFollowUp
      });

      res.json(result);
    })
  );

  app.get(
    '/runs',
    asyncHandler(async (_req, res) => {
      const { rows } = await pool.query(
        'SELECT * FROM assistant_runs ORDER BY started_at DESC LIMIT 50'
      );
      res.json({ runs: rows });
    })
  );

  app.get(
    '/runs/:id',
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(uuidSchema, req.params.id, 'run id');
      const runRes = await pool.query('SELECT * FROM assistant_runs WHERE id = $1', [id]);
      if (runRes.rows.length === 0) {
        throw new NotFoundError('Run not found', 'RUN_NOT_FOUND');
      }
      const stepsRes = await pool.query(
        'SELECT * FROM assistant_steps WHERE run_id = $1 ORDER BY step_number ASC',
        [id]
      );
      res.json({
        ...runRes.rows[0],
        steps: stepsRes.rows
      });
    })
  );

  app.post(
    '/reset',
    asyncHandler(async (_req, res) => {
      await pool.query('TRUNCATE TABLE assistant_steps, assistant_runs');
      logger.info('Reset assistant-service tables');
      res.json({ ok: true });
    })
  );

  app.use(errorHandler(logger));
  return app;
}
