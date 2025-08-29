-- Migration: 007_create_straight_bets_table.sql
-- Creates the straight_bets table to store all betting data

-- Create enum type for bet statuses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bet_status') THEN
        CREATE TYPE bet_status AS ENUM (
          -- A bet has been created but not yet accepted by another user
          'open',
          
          -- A bet has been accepted by another user and is awaiting match result
          'waiting_result',
          
          -- A bet has been settled with a winner determined
          'completed',
          
          -- A bet has been cancelled (by creator before acceptance, or by system)
          'cancelled'
        );
    END IF;
END$$;

-- Create enum type for currency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
        CREATE TYPE currency_type AS ENUM ('points');
    END IF;
END$$;

-- Create the straight_bets table
CREATE TABLE IF NOT EXISTS straight_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_username TEXT NOT NULL,  -- Store username directly
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  creators_pick_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  amount_currency currency_type NOT NULL DEFAULT 'points',
  creators_note TEXT,
  acceptor_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  acceptor_username TEXT,  -- Store username directly (nullable since bet might not be accepted yet)
  acceptors_pick_id TEXT,
  status bet_status NOT NULL DEFAULT 'open',
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT different_picks CHECK (
    acceptors_pick_id IS NULL OR creators_pick_id != acceptors_pick_id
  ),
  CONSTRAINT creator_not_acceptor CHECK (creator_user_id != acceptor_user_id),
  CONSTRAINT winner_is_participant CHECK (
    winner_user_id IS NULL OR 
    winner_user_id = creator_user_id OR 
    winner_user_id = acceptor_user_id
  ),
  CONSTRAINT valid_acceptance CHECK (
    -- Open bets: no acceptor data
    (status = 'open' AND acceptor_user_id IS NULL AND accepted_at IS NULL AND acceptors_pick_id IS NULL AND acceptor_username IS NULL) OR
    -- Cancelled bets: no acceptor data (can be cancelled before acceptance)
    (status = 'cancelled' AND acceptor_user_id IS NULL AND accepted_at IS NULL AND acceptors_pick_id IS NULL AND acceptor_username IS NULL) OR
    -- Non-open, non-cancelled bets: must have acceptor data
    (status NOT IN ('open', 'cancelled') AND acceptor_user_id IS NOT NULL AND accepted_at IS NOT NULL AND acceptors_pick_id IS NOT NULL AND acceptor_username IS NOT NULL)
  ),
  CONSTRAINT valid_completion CHECK (
    (status != 'completed' AND completed_at IS NULL AND winner_user_id IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND winner_user_id IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_straight_bets_creator_user_id ON straight_bets(creator_user_id);
CREATE INDEX idx_straight_bets_acceptor_user_id ON straight_bets(acceptor_user_id);
CREATE INDEX idx_straight_bets_match_id ON straight_bets(match_id);
CREATE INDEX idx_straight_bets_status ON straight_bets(status);
CREATE INDEX idx_straight_bets_created_at ON straight_bets(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_straight_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_straight_bets_updated_at_trigger
    BEFORE UPDATE ON straight_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_straight_bets_updated_at();

-- Enable Row Level Security
ALTER TABLE straight_bets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view bets they created or accepted
CREATE POLICY "Users can view their own bets" ON straight_bets
    FOR SELECT USING (
        creator_user_id = auth.uid() OR 
        acceptor_user_id = auth.uid()
    );

-- Users can view open bets from others (for accepting)
CREATE POLICY "Users can view open bets" ON straight_bets
    FOR SELECT USING (status = 'open');

-- Users can create bets
CREATE POLICY "Users can create bets" ON straight_bets
    FOR INSERT WITH CHECK (
        creator_user_id = auth.uid()
    );

-- Users can update their own bets or accept open bets
CREATE POLICY "Users can update bets" ON straight_bets
    FOR UPDATE USING (
        -- Allow creators to update their own bets
        creator_user_id = auth.uid() OR 
        
        -- Allow authenticated users to accept open bets
        (status = 'open' AND auth.uid() IS NOT NULL AND acceptor_user_id IS NULL) OR
        
        -- Allow service role for system operations
        auth.role() = 'service_role'
    )
    WITH CHECK (
        -- After update, allow if user is creator or acceptor
        creator_user_id = auth.uid() OR 
        acceptor_user_id = auth.uid() OR
        
        -- Allow service role for system operations
        auth.role() = 'service_role'
    );

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.straight_bets TO authenticated;

-- Remove the problematic RLS policy from user_accounts
DROP POLICY IF EXISTS "Users can view basic account info of bet participants" ON public.user_accounts; 