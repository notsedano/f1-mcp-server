-- Migration: Create points transactions table
-- This creates a table to track all points movements for audit purposes

-- Create enum for configurable point modifiers
-- CONVENTION: All values must start with a verb representing the completed action being rewarded
CREATE TYPE point_modifiable_action AS ENUM (
  -- Betting Actions
  'MATCHED_STRAIGHT_BET',           -- When bet creator finds another user to accept their bet
  'WON_STRAIGHT_BET',              -- When a user wins a straight bet match
  
  -- Account Management Actions  
  'CREATED_NEW_ACCOUNT',           -- When a user successfully creates a new account
  'REFERRED_NEW_USER',             -- When referrer successfully signs up a new user
  
  -- Engagement Actions
  'LOGGED_IN_FOR_THE_FIRST_TIME_TODAY' -- When user logs in for the first time in a calendar day
);

-- Create enum for transaction recording (audit trail)
-- CONVENTION: All values must start with a verb representing the completed action being recorded
CREATE TYPE point_transaction AS ENUM (
  -- Bet Creation & Acceptance Transactions
  'CREATED_STRAIGHT_BET',          -- User creates a straight bet (moves free→reserved points)
  'ACCEPTED_STRAIGHT_BET',         -- User accepts another user's bet (moves free→reserved points)
  'RECEIVED_BONUS_FOR_MATCHING_STRAIGHT_BET', -- Bonus awarded when bet gets matched
  
  -- Bet Deletion Transactions
  'DELETED_STRAIGHT_BET',          -- When bet is deleted, refund reserved points back to free
  'UNDO_BONUS_FOR_MATCHING_STRAIGHT_BET', -- Reverse the matching bonus when bet deleted
  
  -- Bet Resolution Transactions (Note: Bet resolution handled by admin app, not this app)
  'WON_STRAIGHT_BET',              -- User wins a bet (receives both their own and opponent's stake)
  'RECEIVED_BONUS_FOR_WINNING_STRAIGHT_BET', -- Bonus awarded for winning a bet
  'LOST_STRAIGHT_BET',             -- User loses a bet (loses their reserved stake)
  
  -- Account Registration Transactions
  'RECEIVED_BONUS_FOR_CREATING_NEW_ACCOUNT', -- Welcome bonus for new accounts
  'RECEIVED_BONUS_FOR_REFERRING_NEW_USER',   -- Referral bonus for successful referrals
  
  -- Daily Engagement Transactions
  'RECEIVED_BONUS_FOR_LOGGING_IN_FOR_THE_FIRST_TIME_TODAY' -- Daily login bonus
);

-- Reuse existing balance type enum (keep the original for compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_balance_type') THEN
        CREATE TYPE point_balance_type AS ENUM (
          -- Affects the free points balance that users can spend
          'FREE',
          
          -- Affects the reserved points balance that is held in escrow
          'RESERVED'
        );
    END IF;
END$$;

-- Create point_transactions table (replaces points_transactions)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  -- Primary identifier  
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User whose points are being affected (references auth.users.id)
  affected_user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Type of action that caused this transaction
  transaction_key point_transaction NOT NULL,
  
  -- Which balance type is affected (FREE or RESERVED)
  affected_balance point_balance_type NOT NULL,
  
  -- Amount of points (positive for additions, negative for subtractions)
  amount DECIMAL(18,8) NOT NULL,
  
  -- Groups related transactions from the same business event
  common_event_id UUID NOT NULL,
  
  -- Additional context data (bet_id, referral codes, etc.)
  details JSONB DEFAULT '{}',
  
  -- When this transaction was recorded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_point_transactions_affected_user_id ON public.point_transactions(affected_user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_transaction_key ON public.point_transactions(transaction_key);
CREATE INDEX IF NOT EXISTS idx_point_transactions_common_event_id ON public.point_transactions(common_event_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_details ON public.point_transactions USING GIN (details);

-- Enable Row Level Security
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON public.point_transactions
  FOR SELECT
  USING (auth.uid() = affected_user_id);

-- RLS Policy: Allow system to insert transactions
CREATE POLICY "System can insert transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (
    -- Allow service role (for server-side operations)
    auth.role() = 'service_role' OR
    -- Allow users to create transactions for themselves
    auth.uid() = affected_user_id OR
    -- Allow during signup process (when user might not be fully authenticated yet)
    auth.uid() IS NOT NULL
  );

-- Add comments for documentation
COMMENT ON TABLE public.point_transactions IS 'Complete audit trail of all points movements with one record per balance change';
COMMENT ON COLUMN public.point_transactions.id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN public.point_transactions.affected_user_id IS 'User whose points are being affected (references auth.users.id)';
COMMENT ON COLUMN public.point_transactions.transaction_key IS 'Type of action that caused this transaction - see point_transaction enum';
COMMENT ON COLUMN public.point_transactions.affected_balance IS 'Which balance type is affected (FREE or RESERVED)';
COMMENT ON COLUMN public.point_transactions.amount IS 'Amount of points (positive for additions, negative for subtractions)';
COMMENT ON COLUMN public.point_transactions.common_event_id IS 'Groups related transactions from the same business event';
COMMENT ON COLUMN public.point_transactions.details IS 'Additional context data (bet_id, referral codes, etc.) as JSON';
COMMENT ON COLUMN public.point_transactions.created_at IS 'When this transaction was recorded';

-- Create validation function for transaction data
CREATE OR REPLACE FUNCTION public.validate_point_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate required details based on transaction type
  CASE NEW.transaction_key
    WHEN 'CREATED_STRAIGHT_BET', 'ACCEPTED_STRAIGHT_BET', 'WON_STRAIGHT_BET', 'LOST_STRAIGHT_BET', 'DELETED_STRAIGHT_BET' THEN
      IF NEW.details->>'bet_id' IS NULL THEN
        RAISE EXCEPTION 'bet_id required in details for transaction type %', NEW.transaction_key;
      END IF;
    WHEN 'RECEIVED_BONUS_FOR_MATCHING_STRAIGHT_BET', 'RECEIVED_BONUS_FOR_WINNING_STRAIGHT_BET', 'UNDO_BONUS_FOR_MATCHING_STRAIGHT_BET' THEN
      IF NEW.details->>'bet_id' IS NULL THEN
        RAISE EXCEPTION 'bet_id required in details for bonus transaction type %', NEW.transaction_key;
      END IF;
    WHEN 'RECEIVED_BONUS_FOR_REFERRING_NEW_USER' THEN
      IF NEW.details->>'referred_user_id' IS NULL THEN
        RAISE EXCEPTION 'referred_user_id required in details for referral bonus';
      END IF;
    ELSE
      -- Other transaction types (account creation, daily login) don't require specific details
      NULL; -- No additional validation needed
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_point_transaction_trigger
  BEFORE INSERT ON public.point_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_point_transaction();

-- Function for recording multiple transactions atomically
CREATE OR REPLACE FUNCTION public.record_multiple_transactions(transactions JSONB[])
RETURNS SETOF point_transactions AS $$
DECLARE
  transaction_data JSONB;
  result point_transactions;
BEGIN
  FOREACH transaction_data IN ARRAY transactions
  LOOP
    INSERT INTO public.point_transactions (
      affected_user_id,
      transaction_key,
      affected_balance, 
      amount,
      common_event_id,
      details
    ) VALUES (
      (transaction_data->>'affected_user_id')::UUID,
      (transaction_data->>'transaction_key')::point_transaction,
      (transaction_data->>'affected_balance')::point_balance_type,
      (transaction_data->>'amount')::DECIMAL(18,8),
      (transaction_data->>'common_event_id')::UUID,
      COALESCE(transaction_data->'details', '{}')
    ) RETURNING * INTO result;
    
    RETURN NEXT result;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.point_transactions TO authenticated; 