-- Mantis Portal — licensing registry (Supabase / PostgreSQL)
-- Run in Supabase SQL Editor or: psql $PORTAL_DATABASE_URL -f portal/database/portal.supabase.sql
--
-- Separate from each customer's Mantis app DB. Stores TurnerTech portal accounts
-- and issued license keys (Community, Professional, Enterprise, Cloud).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Portal accounts (TurnerTech registration — not Mantis admin) ───────────

CREATE TABLE IF NOT EXISTS portal_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  company       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_accounts_email ON portal_accounts (LOWER(email));

-- ─── Issued licenses (JWT keys + tier privileges snapshot) ──────────────────

CREATE TABLE IF NOT EXISTS portal_licenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  tier         TEXT NOT NULL CHECK (tier IN ('community', 'professional', 'enterprise', 'cloud')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'trial')),
  license_key  TEXT NOT NULL,
  instance_id  TEXT,
  is_trial     BOOLEAN NOT NULL DEFAULT FALSE,
  features     JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits       JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_licenses_account ON portal_licenses (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_licenses_instance ON portal_licenses (account_id, instance_id);
CREATE INDEX IF NOT EXISTS idx_portal_licenses_tier ON portal_licenses (tier);

-- ─── Purchase / redeem tokens (Stripe checkout — future) ─────────────────────

CREATE TABLE IF NOT EXISTS portal_purchase_tokens (
  token       TEXT PRIMARY KEY,
  license_id  UUID NOT NULL REFERENCES portal_licenses(id) ON DELETE CASCADE,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Optional: audit log for license events ─────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_license_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  license_id  UUID REFERENCES portal_licenses(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_license_events_account ON portal_license_events (account_id, created_at DESC);
