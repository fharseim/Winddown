-- ── hrauszug.io SaaS schema ───────────────────────────────────────────────────
-- Migration 004: customers, api_keys, subscriptions, usage_logs

-- ── saas_customers ────────────────────────────────────────────────────────────
CREATE TABLE saas_customers (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id          UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  company_name          TEXT,
  email                 TEXT NOT NULL UNIQUE,

  stripe_customer_id    TEXT UNIQUE,
  plan                  TEXT NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'starter', 'growth', 'scale')),
  plan_calls_limit      INTEGER NOT NULL DEFAULT 50,
  calls_this_period     INTEGER NOT NULL DEFAULT 0,
  period_reset_at       TIMESTAMPTZ,

  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT
);

-- ── saas_subscriptions ────────────────────────────────────────────────────────
CREATE TABLE saas_subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id             UUID NOT NULL REFERENCES saas_customers(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT UNIQUE NOT NULL,
  stripe_price_id         TEXT NOT NULL,
  plan                    TEXT NOT NULL,
  status                  TEXT NOT NULL,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saas_subscriptions_customer ON saas_subscriptions(customer_id);

-- ── saas_api_keys ─────────────────────────────────────────────────────────────
-- Plaintext key is shown once at creation and never stored.
-- key_hash = SHA-256(plaintext). key_prefix = first 12 chars for display.

CREATE TABLE saas_api_keys (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID NOT NULL REFERENCES saas_customers(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ,

  label         TEXT,
  key_prefix    TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at    TIMESTAMPTZ,
  revoked_by    TEXT
);

CREATE INDEX idx_saas_api_keys_customer ON saas_api_keys(customer_id);
CREATE INDEX idx_saas_api_keys_hash     ON saas_api_keys(key_hash);

-- ── saas_usage_logs ───────────────────────────────────────────────────────────
CREATE TABLE saas_usage_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  api_key_id        UUID NOT NULL REFERENCES saas_api_keys(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES saas_customers(id) ON DELETE CASCADE,

  endpoint          TEXT NOT NULL,
  method            TEXT NOT NULL DEFAULT 'GET',

  register_art      TEXT,
  register_nummer   TEXT,
  register_gericht  TEXT,
  doc_type          TEXT,

  status_code       INTEGER NOT NULL,
  response_time_ms  INTEGER,
  was_cached        BOOLEAN DEFAULT FALSE,
  billable          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_saas_usage_logs_customer_time
  ON saas_usage_logs(customer_id, created_at DESC);
CREATE INDEX idx_saas_usage_logs_api_key
  ON saas_usage_logs(api_key_id, created_at DESC);

-- ── usage counter increment (atomic, no race condition) ───────────────────────
CREATE OR REPLACE FUNCTION saas_increment_usage(p_customer_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE saas_customers
  SET calls_this_period = calls_this_period + 1
  WHERE id = p_customer_id;
$$;

-- ── daily usage view ──────────────────────────────────────────────────────────
CREATE VIEW saas_usage_daily AS
SELECT
  customer_id,
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) FILTER (WHERE billable)   AS billable_calls,
  COUNT(*)                           AS total_calls,
  COUNT(*) FILTER (WHERE was_cached) AS cached_calls
FROM saas_usage_logs
GROUP BY 1, 2;
