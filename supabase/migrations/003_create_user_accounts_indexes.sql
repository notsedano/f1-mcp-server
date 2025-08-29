-- Migration: Create indexes for user_accounts table
-- This creates indexes for better performance on user_accounts table

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_free_points
ON public.user_accounts(free_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_reserved_points
ON public.user_accounts(reserved_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_total_points
ON public.user_accounts(total_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id
ON public.user_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_accounts_wallet_address
ON public.user_accounts(wallet_address);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email
ON public.user_accounts(email);

CREATE INDEX IF NOT EXISTS idx_user_accounts_username
ON public.user_accounts(username);

CREATE INDEX IF NOT EXISTS idx_user_accounts_last_login_at
ON public.user_accounts(last_login_at); 