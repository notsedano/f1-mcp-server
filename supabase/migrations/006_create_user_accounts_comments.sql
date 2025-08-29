-- Migration: Add comments for user_accounts table
-- This adds documentation comments for the user_accounts table and its columns

-- Add comments for documentation
COMMENT ON TABLE public.user_accounts IS 'User accounts with points information and profile data';
COMMENT ON COLUMN public.user_accounts.id IS 'Primary key for user accounts table';
COMMENT ON COLUMN public.user_accounts.user_id IS 'References auth.users.id for authentication';
COMMENT ON COLUMN public.user_accounts.username IS 'Unique username for the user, auto-generated on account creation';
COMMENT ON COLUMN public.user_accounts.display_name IS 'Display name shown in UI';
COMMENT ON COLUMN public.user_accounts.image_url IS 'URL to user profile image stored in Supabase Storage';
COMMENT ON COLUMN public.user_accounts.free_points IS 'Points that are not yet reserved and can still be spent';
COMMENT ON COLUMN public.user_accounts.reserved_points IS 'Points that are reserved (e.g., held in escrow) and can no longer be spent';
COMMENT ON COLUMN public.user_accounts.total_points IS 'Computed column: sum of free_points and reserved_points';
COMMENT ON COLUMN public.user_accounts.created_at IS 'When the user account was created';
COMMENT ON COLUMN public.user_accounts.updated_points_at IS 'When points balances were last modified';
COMMENT ON COLUMN public.user_accounts.updated_account_settings_at IS 'When non-points profile fields were last modified';
COMMENT ON COLUMN public.user_accounts.updated_at IS 'Latest of updated_points_at and updated_account_settings_at';
COMMENT ON COLUMN public.user_accounts.last_login_at IS 'When the user last logged in';
COMMENT ON COLUMN public.user_accounts.last_daily_bonus_awarded_at IS 'When the daily login bonus was last awarded'; 