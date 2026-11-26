# Pocket Operator — Backend

Backend for **Pocket Operator**, a voice-driven mobile sandbox pickup assistant. Built with Node.js, Express, PostgreSQL (`pg`), Zod, and Google Gemini (`@google/genai`).

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local instance or managed Postgres; `npm test` falls back to `embedded-postgres` automatically when `DATABASE_URL` is not set)
- A Google Gemini API key (`GEMINI_API_KEY`) for live LLM runs (tests inject a mocked `LlmClient`)

## Architecture

```text
Mobile App (React Native)
        │
        ▼  Public HTTP (PORT=3000)
┌───────────────────────────────────────┐
│               gateway                 │
│  /api/*  ──► internal services        │
│  /dev/*  ──► x-dev-token protected    │
│  /health                              │
└──────┬──────────────┬─────────────┬───┘
       │              │             │  (x-internal-key)
       ▼              ▼             ▼
┌──────────────┐ ┌──────────┐ ┌───────────────────┐
│catalog-svc   │ │order-svc │ │assistant-service  │
│:3001         │ │:3002     │ │:3003              │
│              │ │          │ │(Gemini tool loop) │
│restaurants   │ │proposals │ │assistant_runs     │
│dishes        │ │orders    │ │assistant_steps    │
└──────┬───────┘ └────┬─────┘ └─────────┬─────────┘
       │              │                 │
       └──────────────┴────────┬────────┘
                               ▼
                     PostgreSQL (shared DB,
                     no cross-service FKs)
```

- Each service touches **only its own tables** and communicates with other services over HTTP using `x-internal-key`.
- Only `gateway` is exposed publicly.

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/pocket_operator` |
| `GEMINI_API_KEY` | Google Gemini API key (required for live agent calls) | — |
| `GEMINI_MODEL` | Gemini model ID | `gemini-2.5-flash` |
| `INTERNAL_KEY` | Shared secret header `x-internal-key` for internal service calls | — |
| `DEV_TOKEN` | Secret header `x-dev-token` for `/dev/*` endpoints | — |
| `PORT` | Public gateway port | `3000` |
| `CATALOG_PORT` | Internal port for catalog-service | `3001` |
| `ORDER_PORT` | Internal port for order-service | `3002` |
| `ASSISTANT_PORT` | Internal port for assistant-service | `3003` |
| `CATALOG_URL` | Internal URL for catalog-service | `http://127.0.0.1:3001` |
| `ORDER_URL` | Internal URL for order-service | `http://127.0.0.1:3002` |
| `ASSISTANT_URL` | Internal URL for assistant-service | `http://127.0.0.1:3003` |
| `REQUEST_TIMEOUT_MS` | Internal HTTP request timeout (ms) | `10000` |
| `AI_REQUEST_TIMEOUT_MS` | Overall assistant run timeout (ms) | `30000` |

## Commands

```bash
# Install dependencies
npm install

# Run SQL migrations and seed catalog.json (requires DATABASE_URL in .env)
npm run migrate
npm run seed

# Start gateway + all 3 services (dev or prod)
npm run dev
npm start

# Run tests (uses DATABASE_URL if set, otherwise embedded-postgres)
npm test

# Export full trace for a run_id
npm run export-trace -- <run_id>
```

Reset everything during development (requires `x-dev-token`):

```bash
curl -X POST http://localhost:3000/dev/reset \
  -H "x-dev-token: $DEV_TOKEN"
```

## API Summary & `curl` Examples

### Public Mobile Endpoints (Gateway)

- `GET /health`
- `POST /api/agent/run` `{ session_id, text, run_id? }`
- `GET /api/runs`
- `GET /api/runs/:id`
- `GET /api/proposals/:id`
- `POST /api/proposals/:id/confirm` (header `Idempotency-Key` required)
- `POST /api/proposals/:id/cancel`
- `GET /api/orders`
- `GET /api/orders/last`
- `POST /api/orders/:id/directions-result` `{ outcome: "maps_opened" | "browser_fallback_opened" | "could_not_open" }`

```bash
# 1. Ask assistant to prepare cheapest vegetarian lunch up to Rs 200
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"session_id":"mobile-1","text":"cheapest vegetarian lunch up to 200 with directions"}'

# 2. Confirm proposal (replace <proposal_id>)
curl -X POST http://localhost:3000/api/proposals/<proposal_id>/confirm \
  -H "Idempotency-Key: confirm-1"

# 3. Report maps handoff outcome (replace <order_id>)
curl -X POST http://localhost:3000/api/orders/<order_id>/directions-result \
  -H "Content-Type: application/json" \
  -d '{"outcome":"maps_opened"}'

# 4. Inspect run trace
curl http://localhost:3000/api/runs/<run_id>
```

### Dev-Only Endpoints (Require `x-dev-token`)

```bash
# Make dish m4 unavailable (triggers STALE_PROPOSAL on next confirm)
curl -X PATCH http://localhost:3000/dev/dishes/m4 \
  -H "Content-Type: application/json" \
  -H "x-dev-token: $DEV_TOKEN" \
  -d '{"available":false}'

# Reseed catalog from catalog.json
curl -X POST http://localhost:3000/dev/reseed \
  -H "x-dev-token: $DEV_TOKEN"

# Reset runs, proposals, orders, and reseed catalog
curl -X POST http://localhost:3000/dev/reset \
  -H "x-dev-token: $DEV_TOKEN"
```

## Mobile App Backend URL Note

- **Android Emulator:** `http://10.0.2.2:3000`
- **iOS Simulator:** `http://localhost:3000`
- **Physical Device on LAN:** `http://<your-computer-lan-ip>:3000`
- **Deployed (Railway):** `https://<your-service>.up.railway.app`
- Always point the React Native client at the **gateway** URL (`PORT=3000`), never directly at internal service ports `3001–3003`.

## Deploying to Railway

1. Create a new Railway project and add a **PostgreSQL** database service.
2. Add a single Node.js application service rooted at `Backend/` with start command `node database/migrate.js && npm start`.
3. Set environment variables on the app service:
   - `DATABASE_URL` (reference Railway Postgres `${{Postgres.DATABASE_URL}}`)
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-2.5-flash`
   - `INTERNAL_KEY` (strong random string)
   - `DEV_TOKEN` (strong random string)
4. Expose **only** the gateway's `PORT` publicly (Railway injects `PORT`; `start.js` binds the gateway to `PORT` and keeps `catalog-service`, `order-service`, and `assistant-service` on `127.0.0.1` ports `3001–3003`).
5. After first deploy, seed the catalog once via `POST /dev/reseed` (with `x-dev-token`) or `railway run npm run seed`.

## Limitations & Production Readiness

### Current Intentional Limitations (Take-Home Scope)
- **Shared PostgreSQL instance:** All three services share one Postgres database (enforced by convention—each service only queries its own tables and has no cross-service foreign keys) rather than isolated DB instances.
- **Synchronous HTTP service calls:** `order-service` and `assistant-service` call `catalog-service` over localhost HTTP under a single process supervisor (`start.js`).
- **Stale check window:** During `POST /proposals/:id/confirm`, `order-service` locks the `order_proposals` row (`SELECT ... FOR UPDATE`), fetches fresh dish price/availability from `catalog-service`, and then inserts into `orders` inside the same transaction. There is a tiny check-then-insert window between the HTTP read from `catalog-service` and the commit, while duplicate orders are prevented by the proposal row lock and `UNIQUE` constraints on `(proposal_id)` and `(idempotency_key)`.

### Needed for Production
- **End-user authentication & authorization:** JWT/OAuth user identity on gateway routes instead of anonymous `session_id`.
- **Per-user orders & multi-tenancy:** Scope `orders`, `order_proposals`, and `assistant_runs` by authenticated `user_id`.
- **Rate limiting & abuse protection:** Per-IP / per-user rate limits on `/api/agent/run` and confirmation endpoints.
- **Secrets manager:** Store `GEMINI_API_KEY`, `INTERNAL_KEY`, `DEV_TOKEN`, and DB credentials in a secrets manager (e.g., GCP Secret Manager / AWS Secrets Manager) with key rotation.
- **Observability:** OpenTelemetry distributed tracing, structured log aggregation, metrics, and alerting.
- **Service discovery & deployment isolation:** Separate containers/deployments per service behind an internal service mesh or VPC.
- **Message queue / async outbox:** Use a message queue or transactional outbox for reliable event propagation instead of synchronous cross-service HTTP calls.
