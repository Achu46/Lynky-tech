import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
  createLogger,
  requireDevToken,
  asyncHandler,
  serviceFetch,
  errorHandler
} from '@pocket-operator/shared';

export function createGatewayApp({
  logger = createLogger('gateway'),
  catalogUrl = () => process.env.CATALOG_URL || 'http://127.0.0.1:3001',
  orderUrl = () => process.env.ORDER_URL || 'http://127.0.0.1:3002',
  assistantUrl = () => process.env.ASSISTANT_URL || 'http://127.0.0.1:3003'
} = {}) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  const getUrl = {
    catalog: () => (typeof catalogUrl === 'function' ? catalogUrl() : catalogUrl),
    order: () => (typeof orderUrl === 'function' ? orderUrl() : orderUrl),
    assistant: () => (typeof assistantUrl === 'function' ? assistantUrl() : assistantUrl)
  };

  const forward = (serviceFn, targetPath, { forwardHeaders = [] } = {}) =>
    asyncHandler(async (req, res) => {
      const resolvedPath = typeof targetPath === 'function' ? targetPath(req) : targetPath;
      const headers = {};
      for (const h of forwardHeaders) {
        const val = req.get(h);
        if (val !== undefined) headers[h] = val;
      }

      const timeoutMs = resolvedPath.startsWith('/agent')
        ? Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000) + 5000
        : Number(process.env.REQUEST_TIMEOUT_MS || 10000);

      const result = await serviceFetch(serviceFn(), resolvedPath, {
        method: req.method,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
        headers,
        timeoutMs
      });

      res.status(result.status).json(result.data ?? {});
    });

  app.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const checks = await Promise.all([
        serviceFetch(getUrl.catalog(), '/health', { timeoutMs: 2000 }).catch(() => ({ ok: false })),
        serviceFetch(getUrl.order(), '/health', { timeoutMs: 2000 }).catch(() => ({ ok: false })),
        serviceFetch(getUrl.assistant(), '/health', { timeoutMs: 2000 }).catch(() => ({ ok: false }))
      ]);

      const services = {
        catalog: Boolean(checks[0].ok),
        order: Boolean(checks[1].ok),
        assistant: Boolean(checks[2].ok)
      };

      const allOk = services.catalog && services.order && services.assistant;
      res.status(allOk ? 200 : 503).json({
        ok: allOk,
        service: 'gateway',
        services
      });
    })
  );

  // Assistant routes
  app.post('/api/agent/run', forward(getUrl.assistant, '/agent/run'));
  app.get('/api/runs', forward(getUrl.assistant, '/runs'));
  app.get('/api/runs/:id', forward(getUrl.assistant, (req) => `/runs/${encodeURIComponent(req.params.id)}`));

  // Order routes
  app.get('/api/proposals/:id', forward(getUrl.order, (req) => `/proposals/${encodeURIComponent(req.params.id)}`));
  app.post(
    '/api/proposals/:id/confirm',
    forward(getUrl.order, (req) => `/proposals/${encodeURIComponent(req.params.id)}/confirm`, {
      forwardHeaders: ['Idempotency-Key']
    })
  );
  app.post(
    '/api/proposals/:id/cancel',
    forward(getUrl.order, (req) => `/proposals/${encodeURIComponent(req.params.id)}/cancel`)
  );
  app.get('/api/orders', forward(getUrl.order, '/orders'));
  app.get('/api/orders/last', forward(getUrl.order, '/orders/last'));
  app.post(
    '/api/orders/:id/directions-result',
    forward(getUrl.order, (req) => `/orders/${encodeURIComponent(req.params.id)}/directions-result`)
  );

  // Dev-only routes
  app.use('/dev', requireDevToken());
  app.post(
    '/dev/reset',
    asyncHandler(async (_req, res) => {
      const [assistantRes, orderRes, catalogRes] = await Promise.all([
        serviceFetch(getUrl.assistant(), '/reset', { method: 'POST' }),
        serviceFetch(getUrl.order(), '/reset', { method: 'POST' }),
        serviceFetch(getUrl.catalog(), '/reseed', { method: 'POST' })
      ]);

      if (!assistantRes.ok || !orderRes.ok || !catalogRes.ok) {
        return res.status(502).json({
          error: 'RESET_FAILED',
          details: {
            assistant: assistantRes.status,
            order: orderRes.status,
            catalog: catalogRes.status
          }
        });
      }

      logger.info('Dev reset & reseed completed');
      res.json({ ok: true, catalog: catalogRes.data });
    })
  );
  app.patch('/dev/dishes/:id', forward(getUrl.catalog, (req) => `/dishes/${encodeURIComponent(req.params.id)}`));
  app.post('/dev/reseed', forward(getUrl.catalog, '/reseed'));

  app.use(errorHandler(logger));
  return app;
}
