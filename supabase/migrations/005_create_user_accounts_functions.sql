-- Migration: Create functions for user_accounts table
-- This creates user account management functions

-- Function to safely update user points, letting PostgreSQL auto-calculate total_points
CREATE OR REPLACE FUNCTION public.set_user_points(
  target_user_id UUID,
  new_free_points DECIMAL(18,8),
  new_reserved_points DECIMAL(18,8)
)
RETURNS TABLE(
  free_points DECIMAL(18,8), 
  reserved_points DECIMAL(18,8), 
  total_points DECIMAL(18,8)
) AS $$
BEGIN
  UPDATE public.user_accounts 
  SET 
    free_points = new_free_points,
    reserved_points = new_reserved_points,
    -- total_points will be automatically calculated by PostgreSQL
    updated_points_at = NOW(),
    updated_at = NOW()  -- Always update both timestamps
  WHERE user_id = target_user_id;

  -- Return the updated values, letting PostgreSQL provide the calculated total_points
  RETURN QUERY 
  SELECT ua.free_points, ua.reserved_points, ua.total_points
  FROM public.user_accounts ua
  WHERE ua.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update account settings and maintain timestamp consistency
CREATE OR REPLACE FUNCTION public.update_user_account_settings(
  target_user_id UUID,
  new_username TEXT DEFAULT NULL,
  new_display_name TEXT DEFAULT NULL,
  new_wallet_address TEXT DEFAULT NULL,
  new_email TEXT DEFAULT NULL,
  new_image_url TEXT DEFAULT NULL
)
RETURNS public.user_accounts AS $$
DECLARE
  result public.user_accounts;
BEGIN
  UPDATE public.user_accounts 
  SET 
    username = COALESCE(new_username, username),
    display_name = COALESCE(new_display_name, display_name),
    wallet_address = COALESCE(new_wallet_address, wallet_address),
    email = COALESCE(new_email, email),
    image_url = COALESCE(new_image_url, image_url),
    updated_account_settings_at = NOW(),
    updated_at = NOW()  -- Always update both timestamps
  WHERE user_id = target_user_id
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update login tracking and award daily bonus if eligible
CREATE OR REPLACE FUNCTION public.update_user_login(
  target_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_record public.user_accounts;
  today_date DATE;
  last_bonus_date DATE;
  bonus_amount DECIMAL(18,8);
  awarded_bonus BOOLEAN := false;
BEGIN
  -- Get current user record
  SELECT * INTO user_record FROM public.user_accounts WHERE user_id = target_user_id;
  
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'User account not found: %', target_user_id;
  END IF;
  
  -- Get today's date in UTC
  today_date := CURRENT_DATE;
  
  -- Fix: Use last_login_at as fallback when last_daily_bonus_awarded_at is NULL
  -- If both are NULL (completely new user), use today's date to prevent bonus on first login
  last_bonus_date := COALESCE(
    user_record.last_daily_bonus_awarded_at::DATE, 
    user_record.last_login_at::DATE,
    today_date  -- No bonus for brand new users on same day
  );
  
  -- Check if daily bonus should be awarded
  IF last_bonus_date < today_date THEN
    -- Get daily bonus amount from configuration
    SELECT current_value INTO bonus_amount
    FROM public.point_modifiable_action_configurations
    WHERE action_key = 'LOGGED_IN_FOR_THE_FIRST_TIME_TODAY' AND is_enabled = true;
    
    IF bonus_amount IS NOT NULL AND bonus_amount > 0 THEN
      -- Award daily bonus
      PERFORM public.set_user_points(
        target_user_id,
        user_record.free_points + bonus_amount,
        user_record.reserved_points
      );
      
      -- Record the transaction
      INSERT INTO public.point_transactions (
        affected_user_id,
        transaction_key,
        affected_balance,
        amount,
        common_event_id,
        details
      ) VALUES (
        target_user_id,
        'RECEIVED_BONUS_FOR_LOGGING_IN_FOR_THE_FIRST_TIME_TODAY',
        'FREE',
        bonus_amount,
        gen_random_uuid(),
        '{}'
      );
      
      -- Update daily bonus tracking
      UPDATE public.user_accounts
      SET 
        last_daily_bonus_awarded_at = NOW(),
        updated_at = NOW()
      WHERE user_id = target_user_id;
      
      awarded_bonus := true;
    END IF;
  END IF;
  
  -- Always update last login time
  UPDATE public.user_accounts
  SET 
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN awarded_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user account with signup bonus atomically
CREATE OR REPLACE FUNCTION public.create_user_account_with_signup_bonus(
  p_user_id UUID,
  p_email TEXT,
  p_username TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  signup_bonus DECIMAL(18,8);
  common_event_id UUID;
  final_username TEXT;
BEGIN
  -- Get signup bonus amount from configuration
  SELECT current_value INTO signup_bonus
  FROM public.point_modifiable_action_configurations
  WHERE action_key = 'CREATED_NEW_ACCOUNT' AND is_enabled = true;
  
  IF signup_bonus IS NULL THEN
    RAISE EXCEPTION 'No signup bonus configuration found for CREATED_NEW_ACCOUNT action';
  END IF;
  
  -- Generate username if not provided
  IF p_username IS NULL THEN
    final_username := generate_unique_username();
  ELSE
    final_username := p_username;
  END IF;
  
  -- Generate common event ID for related transactions
  common_event_id := gen_random_uuid();
  
  -- Insert user account with signup bonus
  INSERT INTO public.user_accounts (
    user_id,
    email,
    username,
    free_points,
    reserved_points,
    -- total_points will be automatically calculated by PostgreSQL
    created_at,
    updated_points_at,
    updated_account_settings_at,
    updated_at,
    last_login_at  -- Set login time during account creation
  ) VALUES (
    p_user_id,
    p_email,
    final_username,
    signup_bonus,
    0,
    -- No total_points value - PostgreSQL will calculate it
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    NOW()  -- Initialize last_login_at to prevent immediate daily bonus
  );
  
  -- Record signup bonus transaction
  INSERT INTO public.point_transactions (
    affected_user_id,
    transaction_key,
    affected_balance,
    amount,
    common_event_id,
    details
  ) VALUES (
    p_user_id,
    'RECEIVED_BONUS_FOR_CREATING_NEW_ACCOUNT',
    'FREE',
    signup_bonus,
    common_event_id,
    '{}'
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;