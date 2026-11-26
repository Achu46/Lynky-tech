CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Catalog Service tables
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_vegetarian BOOLEAN NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dishes_search
  ON dishes (is_available, is_vegetarian, price, id);

-- Assistant Service tables
CREATE TABLE IF NOT EXISTS assistant_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'needs_answer', 'needs_approval', 'done', 'failed')),
  reply_text TEXT,
  error_code TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistant_runs_session
  ON assistant_runs (session_id, started_at DESC);

CREATE TABLE IF NOT EXISTS assistant_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES assistant_runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT NOT NULL CHECK (outcome IN ('ok', 'rejected', 'error')),
  short_note TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_steps_run
  ON assistant_steps (run_id, step_number ASC);

-- Order Service tables (NO foreign keys across service boundaries)
CREATE TABLE IF NOT EXISTS order_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  dish_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  max_price NUMERIC(10, 2) NOT NULL CHECK (max_price >= 0),
  vegetarian BOOLEAN NOT NULL,
  wants_directions BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'stale')),
  replaces_proposal_id UUID REFERENCES order_proposals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_proposals_one_pending_per_run
  ON order_proposals (run_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL UNIQUE REFERENCES order_proposals(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  dish_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  label TEXT NOT NULL DEFAULT 'SANDBOX',
  status TEXT NOT NULL DEFAULT 'sandbox_saved',
  directions_status TEXT CHECK (
    directions_status IS NULL OR
    directions_status IN ('maps_opened', 'browser_fallback_opened', 'could_not_open')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
