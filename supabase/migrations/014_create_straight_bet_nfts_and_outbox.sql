-- Migration: Create tables for on-chain NFT receipts per bet lifecycle and an outbox for on-chain jobs
-- Context: We mint one immutable NFT receipt per lifecycle action (created, accepted, settled, cancelled).
--          This schema tracks those tokens and orchestrates minting with a simple outbox.

-- =============================
-- Enums
-- =============================

-- Which lifecycle action a specific NFT receipt represents (NOT the bet's current status).
-- We mint at most one token per action, per bet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'straight_bet_onchain_receipt_action') THEN
    CREATE TYPE straight_bet_onchain_receipt_action AS ENUM ('created', 'accepted', 'settled', 'cancelled');
  END IF;
END$$;

-- Local processing state of an NFT record in our DB (not business state).
-- 'pending'  : record exists, on-chain mint not yet confirmed
-- 'minted'   : on-chain mint succeeded; token_id and tx recorded
-- 'failed'   : on-chain mint failed definitively; manual retry may be needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'straight_bet_nft_status_localdb') THEN
    CREATE TYPE straight_bet_nft_status_localdb AS ENUM ('pending', 'minted', 'failed');
  END IF;
END$$;

-- Outbox job key describes what on-chain side-effect to perform.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onchain_job_key') THEN
    CREATE TYPE onchain_job_key AS ENUM (
      'MINT_CREATED',
      'MINT_ACCEPTED',
      'MINT_SETTLED',
      'MINT_CANCELLED'
    );
  END IF;
END$$;

-- Outbox job lifecycle states.
-- 'pending'         : queued for execution
-- 'in_progress'     : currently being executed
-- 'successful'      : completed and recorded; kept for audit
-- 'failed_retrying' : failed; will retry later with backoff
-- 'failed_dormant'  : retries stopped; requires manual intervention (dead letter)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onchain_job_status') THEN
    CREATE TYPE onchain_job_status AS ENUM ('pending', 'in_progress', 'successful', 'failed_retrying', 'failed_dormant');
  END IF;
END$$;

-- =============================
-- Table: straight_bet_nfts
-- Purpose: One row per bet per lifecycle action; tracks immutable on-chain receipts
-- =============================
CREATE TABLE IF NOT EXISTS public.straight_bet_nfts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to the bet
  bet_id UUID NOT NULL REFERENCES public.straight_bets(id) ON DELETE CASCADE,

  -- Which lifecycle action this token represents
  lifecycle_action straight_bet_onchain_receipt_action NOT NULL,

  -- On-chain identity (Core Testnet2 = 1114)
  chain_id INTEGER NOT NULL DEFAULT 1114,
  contract_address TEXT NOT NULL,
  token_id TEXT, -- set after mint; stored as TEXT for uint256 safety

  -- Who should own this receipt (payer/actor at that stage)
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_address TEXT,

  -- Local processing state
  local_status straight_bet_nft_status_localdb NOT NULL DEFAULT 'pending',

  -- On-chain transaction details
  mint_tx_hash TEXT,
  minted_at TIMESTAMPTZ,

  -- Metadata references/snapshots for audit
  metadata_uri TEXT,
  metadata_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- At most one token per (bet, action)
  CONSTRAINT straight_bet_nfts_bet_action_unique UNIQUE (bet_id, lifecycle_action),

  -- Prevent duplicate on-chain tokens once minted
  CONSTRAINT straight_bet_nfts_chain_token_unique UNIQUE (chain_id, contract_address, token_id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_straight_bet_nfts_bet_id ON public.straight_bet_nfts(bet_id);
CREATE INDEX IF NOT EXISTS idx_straight_bet_nfts_action ON public.straight_bet_nfts(lifecycle_action);
CREATE INDEX IF NOT EXISTS idx_straight_bet_nfts_local_status ON public.straight_bet_nfts(local_status);

CREATE OR REPLACE FUNCTION public.update_straight_bet_nfts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_straight_bet_nfts_updated_at ON public.straight_bet_nfts;
CREATE TRIGGER trg_update_straight_bet_nfts_updated_at
  BEFORE UPDATE ON public.straight_bet_nfts
  FOR EACH ROW EXECUTE FUNCTION public.update_straight_bet_nfts_updated_at();

-- Enable RLS and basic policies: owner of the token record can manage it
ALTER TABLE public.straight_bet_nfts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'straight_bet_nfts' AND policyname = 'nfts_select_owner'
  ) THEN
    CREATE POLICY nfts_select_owner ON public.straight_bet_nfts
      FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'straight_bet_nfts' AND policyname = 'nfts_insert_owner'
  ) THEN
    CREATE POLICY nfts_insert_owner ON public.straight_bet_nfts
      FOR INSERT TO authenticated
      WITH CHECK (owner_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'straight_bet_nfts' AND policyname = 'nfts_update_owner'
  ) THEN
    CREATE POLICY nfts_update_owner ON public.straight_bet_nfts
      FOR UPDATE TO authenticated
      USING (owner_user_id = auth.uid())
      WITH CHECK (owner_user_id = auth.uid());
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE ON public.straight_bet_nfts TO authenticated;

-- =============================
-- Table: onchain_outbox_jobs
-- Purpose: Orchestrate on-chain mints with retries and audit trail
-- =============================
CREATE TABLE IF NOT EXISTS public.onchain_outbox_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_key onchain_job_key NOT NULL,
  status onchain_job_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL, -- includes bet_id, lifecycle_action, chain_id, contract, destination_wallet_address, metadata_uri
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 10,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  processed_at TIMESTAMPTZ,

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onchain_outbox_status_runat ON public.onchain_outbox_jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_onchain_outbox_job_key ON public.onchain_outbox_jobs(job_key);

CREATE OR REPLACE FUNCTION public.update_onchain_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_onchain_outbox_updated_at ON public.onchain_outbox_jobs;
CREATE TRIGGER trg_update_onchain_outbox_updated_at
  BEFORE UPDATE ON public.onchain_outbox_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_onchain_outbox_updated_at();

-- RLS: creator of the job can manage it
ALTER TABLE public.onchain_outbox_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'onchain_outbox_jobs' AND policyname = 'outbox_select_creator'
  ) THEN
    CREATE POLICY outbox_select_creator ON public.onchain_outbox_jobs
      FOR SELECT TO authenticated
      USING (created_by_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'onchain_outbox_jobs' AND policyname = 'outbox_insert_creator'
  ) THEN
    CREATE POLICY outbox_insert_creator ON public.onchain_outbox_jobs
      FOR INSERT TO authenticated
      WITH CHECK (created_by_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'onchain_outbox_jobs' AND policyname = 'outbox_update_creator'
  ) THEN
    CREATE POLICY outbox_update_creator ON public.onchain_outbox_jobs
      FOR UPDATE TO authenticated
      USING (created_by_user_id = auth.uid())
      WITH CHECK (created_by_user_id = auth.uid());
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE ON public.onchain_outbox_jobs TO authenticated;


