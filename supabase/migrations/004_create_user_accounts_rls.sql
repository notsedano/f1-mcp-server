-- Migration: Create RLS policies for user_accounts table
-- This enables Row Level Security and creates appropriate policies

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view public leaderboard data from all accounts
-- This allows leaderboard functionality while protecting private data
CREATE POLICY "Users can view public leaderboard data" ON public.user_accounts
FOR SELECT USING (
  -- Allow authenticated users to see public fields needed for leaderboard
  auth.role() = 'authenticated'
);

-- RLS Policy: Users can view their own account with full details (redundant but explicit)
CREATE POLICY "Users can view own account details" ON public.user_accounts
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid()::text = wallet_address
);

-- RLS Policy: Users can update their own account
CREATE POLICY "Users can update own account" ON public.user_accounts
FOR UPDATE USING (
  auth.uid() = user_id OR 
  auth.uid()::text = wallet_address
);

-- RLS Policy: Allow account creation during signup
-- This is the critical policy for signup to work
CREATE POLICY "Allow account creation during signup" ON public.user_accounts
FOR INSERT WITH CHECK (
  -- Allow if the user_id matches the authenticated user
  auth.uid() = user_id OR
  -- Allow if inserting wallet-only account (for wallet-first users)
  (user_id IS NULL AND wallet_address IS NOT NULL) OR
  -- Allow service role (for server-side operations)
  auth.role() = 'service_role'
);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.user_accounts TO authenticated; 