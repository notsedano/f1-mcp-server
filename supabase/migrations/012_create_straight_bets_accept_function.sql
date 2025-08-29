-- Migration: Create function to accept straight bets atomically
-- This function handles bet acceptance with complete atomicity

-- Function to accept straight bet atomically
CREATE OR REPLACE FUNCTION public.accept_straight_bet_atomic(
  p_user_id UUID,
  p_bet_id UUID,
  p_acceptors_pick_id TEXT,
  p_common_event_id UUID
)
RETURNS VOID AS $$
DECLARE
  user_record public.user_accounts;
  creator_record public.user_accounts;
  bet_record public.straight_bets;
  acceptor_username TEXT;
  bonus_amount DECIMAL(18,8);
BEGIN
  -- Get bet record and validate
  SELECT * INTO bet_record FROM public.straight_bets WHERE id = p_bet_id;
  
  IF bet_record IS NULL THEN
    RAISE EXCEPTION 'Bet not found: %', p_bet_id;
  END IF;
  
  IF bet_record.status != 'open' THEN
    RAISE EXCEPTION 'Bet is no longer available for acceptance';
  END IF;
  
  IF bet_record.creator_user_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own bet';
  END IF;
  
  -- Get acceptor account and validate sufficient points
  SELECT * INTO user_record FROM public.user_accounts WHERE user_id = p_user_id;
  
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'User account not found: %', p_user_id;
  END IF;
  
  IF user_record.free_points < bet_record.amount THEN
    RAISE EXCEPTION 'Insufficient points. Required: %, Available: %', bet_record.amount, user_record.free_points;
  END IF;
  
  -- Get creator account for bonus
  SELECT * INTO creator_record FROM public.user_accounts WHERE user_id = bet_record.creator_user_id;
  
  -- Get acceptor username
  acceptor_username := COALESCE(user_record.email, user_record.wallet_address, user_record.username);
  
  -- Record acceptor's point transactions (reserve their stake)
  INSERT INTO public.point_transactions (
    affected_user_id,
    transaction_key,
    affected_balance,
    amount,
    common_event_id,
    details
  ) VALUES 
    (p_user_id, 'ACCEPTED_STRAIGHT_BET', 'FREE', -bet_record.amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id)),
    (p_user_id, 'ACCEPTED_STRAIGHT_BET', 'RESERVED', bet_record.amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id));
  
  -- Update acceptor's points balance
  PERFORM public.set_user_points(
    p_user_id,
    user_record.free_points - bet_record.amount,
    user_record.reserved_points + bet_record.amount
  );
  
  -- Get matching bonus amount
  SELECT current_value INTO bonus_amount
  FROM public.point_modifiable_action_configurations
  WHERE action_key = 'MATCHED_STRAIGHT_BET' AND is_enabled = true;
  
  -- Award matching bonuses to both users if configured
  IF bonus_amount IS NOT NULL AND bonus_amount > 0 THEN
    -- Bonus for creator
    INSERT INTO public.point_transactions (
      affected_user_id,
      transaction_key,
      affected_balance,
      amount,
      common_event_id,
      details
    ) VALUES (
      bet_record.creator_user_id,
      'RECEIVED_BONUS_FOR_MATCHING_STRAIGHT_BET',
      'FREE',
      bonus_amount,
      p_common_event_id,
      jsonb_build_object('bet_id', p_bet_id)
    );
    
    PERFORM public.set_user_points(
      bet_record.creator_user_id,
      creator_record.free_points + bonus_amount,
      creator_record.reserved_points
    );
    
    -- Bonus for acceptor
    INSERT INTO public.point_transactions (
      affected_user_id,
      transaction_key,
      affected_balance,
      amount,
      common_event_id,
      details
    ) VALUES (
      p_user_id,
      'RECEIVED_BONUS_FOR_MATCHING_STRAIGHT_BET',
      'FREE',
      bonus_amount,
      p_common_event_id,
      jsonb_build_object('bet_id', p_bet_id)
    );
    
    PERFORM public.set_user_points(
      p_user_id,
      user_record.free_points - bet_record.amount + bonus_amount,
      user_record.reserved_points + bet_record.amount
    );
  END IF;
  
  -- Update bet record
  UPDATE public.straight_bets
  SET 
    acceptor_user_id = p_user_id,
    acceptor_username = acceptor_username,
    acceptors_pick_id = p_acceptors_pick_id,
    status = 'waiting_result',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 