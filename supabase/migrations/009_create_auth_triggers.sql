-- Migration: Create auth triggers for automatic user account creation and signup bonus
-- This sets up database triggers that automatically create user accounts and award signup bonuses
-- when new users are created in the auth.users table

-- Create function to insert additional rows after email signup
CREATE OR REPLACE FUNCTION public.insert_rows_after_signup_from_email() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  signup_bonus_amount DECIMAL(18,8);
  transaction_id UUID;
BEGIN
  -- Get the configured signup bonus amount
  SELECT points_value INTO signup_bonus_amount
  FROM public.points_config 
  WHERE action_type = 'SIGNUP' AND is_active = true;
  
  -- Default to 500 if no configuration found
  IF signup_bonus_amount IS NULL THEN
    signup_bonus_amount := 500;
  END IF;

  -- Create user account record (username auto-generated via table default)
  INSERT INTO public.user_accounts (
    user_id, 
    email, 
    free_points, 
    reserved_points,
    last_login_at  -- Set login time during account creation
  ) VALUES (
    NEW.id, 
    NEW.email, 
    signup_bonus_amount,  -- Award signup bonus immediately
    0,
    NOW()  -- Initialize last_login_at to prevent immediate daily bonus
  );

  -- Create signup bonus transaction record
  INSERT INTO public.points_transactions (
    user_id,
    transaction_type,
    balance_type,
    amount,
    common_event_id,
    metadata
  ) VALUES (
    NEW.id,
    'SIGNUP',
    'FREE',
    signup_bonus_amount,
    gen_random_uuid(),  -- Generate unique event ID
    jsonb_build_object(
      'source', 'auth_trigger',
      'signup_bonus_amount', signup_bonus_amount,
      'trigger_time', NOW()
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error in insert_rows_after_signup_from_email trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create function to insert rows after wallet signup
CREATE OR REPLACE FUNCTION public.insert_rows_after_signup_from_wallet(
  wallet_user_id TEXT,
  wallet_address TEXT
)
RETURNS jsonb
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  signup_bonus_amount DECIMAL(18,8);
  existing_account RECORD;
  account_result RECORD;
BEGIN
  -- Check if account already exists
  SELECT * INTO existing_account 
  FROM public.user_accounts 
  WHERE user_id::text = wallet_user_id OR wallet_address = insert_rows_after_signup_from_wallet.wallet_address;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account already exists',
      'account_id', existing_account.id
    );
  END IF;

  -- Get the configured signup bonus amount
  SELECT points_value INTO signup_bonus_amount
  FROM public.points_config 
  WHERE action_type = 'SIGNUP' AND is_active = true;
  
  -- Default to 500 if no configuration found
  IF signup_bonus_amount IS NULL THEN
    signup_bonus_amount := 500;
  END IF;

  -- Create user account record with signup bonus (username auto-generated via table default)
  INSERT INTO public.user_accounts (
    user_id, 
    wallet_address,
    free_points, 
    reserved_points,
    last_login_at  -- Set login time during account creation
  ) VALUES (
    wallet_user_id::uuid, 
    insert_rows_after_signup_from_wallet.wallet_address,
    signup_bonus_amount,  -- Award signup bonus immediately
    0,
    NOW()  -- Initialize last_login_at to prevent immediate daily bonus
  ) RETURNING * INTO account_result;

  -- Create signup bonus transaction record
  INSERT INTO public.points_transactions (
    user_id,
    transaction_type,
    balance_type,
    amount,
    common_event_id,
    metadata
  ) VALUES (
    wallet_user_id::uuid,
    'SIGNUP',
    'FREE',
    signup_bonus_amount,
    gen_random_uuid(),
    jsonb_build_object(
      'source', 'wallet_signup',
      'wallet_address', insert_rows_after_signup_from_wallet.wallet_address,
      'signup_bonus_amount', signup_bonus_amount,
      'created_time', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'account_id', account_result.id,
    'signup_bonus_awarded', signup_bonus_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create trigger that fires when new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.insert_rows_after_signup_from_email();

-- Add comments for documentation
COMMENT ON FUNCTION public.insert_rows_after_signup_from_email() IS 'Inserts user_accounts and points_transactions rows after email signup with auto-generated username';
COMMENT ON FUNCTION public.insert_rows_after_signup_from_wallet(TEXT, TEXT) IS 'Inserts user_accounts and points_transactions rows after wallet signup with auto-generated username'; 