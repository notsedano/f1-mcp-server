-- Migration: Wallet connection sessions for MetaMask deep-link flow (no localStorage)

-- Enum for session status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_connection_status') THEN
    CREATE TYPE wallet_connection_status AS ENUM ('pending', 'connected', 'failed');
  END IF;
END$$;

-- Table to coordinate a mobile deep-link roundtrip into MetaMask's in-app browser
CREATE TABLE IF NOT EXISTS public.wallet_connection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status wallet_connection_status NOT NULL DEFAULT 'pending',
  return_path TEXT,                      -- where to navigate after completion
  wallet_address TEXT,                   -- filled on completion for audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_conn_user ON public.wallet_connection_sessions(user_id);

CREATE OR REPLACE FUNCTION public.update_wallet_connection_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wallet_connection_sessions_updated_at ON public.wallet_connection_sessions;
CREATE TRIGGER trg_update_wallet_connection_sessions_updated_at
  BEFORE UPDATE ON public.wallet_connection_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_connection_sessions_updated_at();

-- Enable RLS
ALTER TABLE public.wallet_connection_sessions ENABLE ROW LEVEL SECURITY;

-- Only the authenticated owner can see/create/update their session rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallet_connection_sessions' AND policyname='wcs_select_owner'
  ) THEN
    CREATE POLICY wcs_select_owner ON public.wallet_connection_sessions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallet_connection_sessions' AND policyname='wcs_insert_owner'
  ) THEN
    CREATE POLICY wcs_insert_owner ON public.wallet_connection_sessions
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wallet_connection_sessions' AND policyname='wcs_update_owner'
  ) THEN
    CREATE POLICY wcs_update_owner ON public.wallet_connection_sessions
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE ON public.wallet_connection_sessions TO authenticated;


