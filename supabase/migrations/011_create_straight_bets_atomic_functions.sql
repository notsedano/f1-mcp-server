-- Migration: Create atomic functions for straight bets operations
-- These functions handle betting operations with complete atomicity

-- Function to create straight bet atomically
CREATE OR REPLACE FUNCTION public.create_straight_bet_atomic(
  p_user_id UUID,
  p_bet_id UUID,
  p_match_id TEXT,
  p_creators_pick_id TEXT,
  p_amount DECIMAL(18,8),
  p_creators_note TEXT,
  p_common_event_id UUID
)
RETURNS public.straight_bets AS $$
DECLARE
  user_record public.user_accounts;
  bet_result public.straight_bets;
  creator_username TEXT;
BEGIN
  -- Get user account and validate sufficient points
  SELECT * INTO user_record FROM public.user_accounts WHERE user_id = p_user_id;
  
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'User account not found: %', p_user_id;
  END IF;
  
  IF user_record.free_points < p_amount THEN
    RAISE EXCEPTION 'Insufficient points. Required: %, Available: %', p_amount, user_record.free_points;
  END IF;
  
  -- Get username for bet display
  creator_username := COALESCE(user_record.email, user_record.wallet_address, user_record.username);
  
  -- Record point transactions
  INSERT INTO public.point_transactions (
    affected_user_id,
    transaction_key,
    affected_balance,
    amount,
    common_event_id,
    details
  ) VALUES 
    (p_user_id, 'CREATED_STRAIGHT_BET', 'FREE', -p_amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id)),
    (p_user_id, 'CREATED_STRAIGHT_BET', 'RESERVED', p_amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id));
  
  -- Update user points balance
  PERFORM public.set_user_points(
    p_user_id,
    user_record.free_points - p_amount,
    user_record.reserved_points + p_amount
  );
  
  -- Create bet record
  INSERT INTO public.straight_bets (
    id,
    creator_user_id,
    creator_username,
    match_id,
    creators_pick_id,
    amount,
    amount_currency,
    creators_note,
    status
  ) VALUES (
    p_bet_id,
    p_user_id,
    creator_username,
    p_match_id,
    p_creators_pick_id,
    p_amount,
    'points',
    p_creators_note,
    'open'
  ) RETURNING * INTO bet_result;
  
  RETURN bet_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 