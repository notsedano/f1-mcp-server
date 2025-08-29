-- Migration: Create function to delete straight bets atomically
-- This function handles bet deletion/cancellation with complete atomicity

-- Function to delete straight bet atomically
CREATE OR REPLACE FUNCTION public.delete_straight_bet_atomic(
  p_bet_id UUID,
  p_common_event_id UUID
)
RETURNS VOID AS $$
DECLARE
  bet_record public.straight_bets;
  creator_record public.user_accounts;
  acceptor_record public.user_accounts;
  bonus_amount DECIMAL(18,8);
BEGIN
  -- Get bet record and validate
  SELECT * INTO bet_record FROM public.straight_bets WHERE id = p_bet_id;
  
  IF bet_record IS NULL THEN
    RAISE EXCEPTION 'Bet not found: %', p_bet_id;
  END IF;
  
  IF bet_record.status NOT IN ('open', 'waiting_result') THEN
    RAISE EXCEPTION 'Cannot delete completed or cancelled bet';
  END IF;
  
  -- Get user accounts
  SELECT * INTO creator_record FROM public.user_accounts WHERE user_id = bet_record.creator_user_id;
  
  IF bet_record.acceptor_user_id IS NOT NULL THEN
    SELECT * INTO acceptor_record FROM public.user_accounts WHERE user_id = bet_record.acceptor_user_id;
  END IF;
  
  -- Refund creator's stake
  INSERT INTO public.point_transactions (
    affected_user_id,
    transaction_key,
    affected_balance,
    amount,
    common_event_id,
    details
  ) VALUES 
    (bet_record.creator_user_id, 'DELETED_STRAIGHT_BET', 'RESERVED', -bet_record.amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id)),
    (bet_record.creator_user_id, 'DELETED_STRAIGHT_BET', 'FREE', bet_record.amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id));
  
  PERFORM public.set_user_points(
    bet_record.creator_user_id,
    creator_record.free_points + bet_record.amount,
    creator_record.reserved_points - bet_record.amount
  );
  
  -- If bet was accepted, refund acceptor and reverse bonuses
  IF bet_record.acceptor_user_id IS NOT NULL THEN
    -- Refund acceptor's stake
    INSERT INTO public.point_transactions (
      affected_user_id,
      transaction_key,
      affected_balance,
      amount,
      common_event_id,
      details
    ) VALUES 
      (bet_record.acceptor_user_id, 'DELETED_STRAIGHT_BET', 'RESERVED', -bet_record.amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id)),
      (bet_record.acceptor_user_id, 'DELETED_STRAIGHT_BET', 'FREE', bet_record.amount, p_common_event_id, jsonb_build_object('bet_id', p_bet_id));
    
    PERFORM public.set_user_points(
      bet_record.acceptor_user_id,
      acceptor_record.free_points + bet_record.amount,
      acceptor_record.reserved_points - bet_record.amount
    );
    
    -- Reverse matching bonuses if they were awarded
    SELECT current_value INTO bonus_amount
    FROM public.point_modifiable_action_configurations
    WHERE action_key = 'MATCHED_STRAIGHT_BET' AND is_enabled = true;
    
    IF bonus_amount IS NOT NULL AND bonus_amount > 0 THEN
      -- Reverse creator bonus
      INSERT INTO public.point_transactions (
        affected_user_id,
        transaction_key,
        affected_balance,
        amount,
        common_event_id,
        details
      ) VALUES (
        bet_record.creator_user_id,
        'UNDO_BONUS_FOR_MATCHING_STRAIGHT_BET',
        'FREE',
        -bonus_amount,
        p_common_event_id,
        jsonb_build_object('bet_id', p_bet_id)
      );
      
      PERFORM public.set_user_points(
        bet_record.creator_user_id,
        creator_record.free_points + bet_record.amount - bonus_amount,
        creator_record.reserved_points - bet_record.amount
      );
      
      -- Reverse acceptor bonus
      INSERT INTO public.point_transactions (
        affected_user_id,
        transaction_key,
        affected_balance,
        amount,
        common_event_id,
        details
      ) VALUES (
        bet_record.acceptor_user_id,
        'UNDO_BONUS_FOR_MATCHING_STRAIGHT_BET',
        'FREE',
        -bonus_amount,
        p_common_event_id,
        jsonb_build_object('bet_id', p_bet_id)
      );
      
      PERFORM public.set_user_points(
        bet_record.acceptor_user_id,
        acceptor_record.free_points + bet_record.amount - bonus_amount,
        acceptor_record.reserved_points - bet_record.amount
      );
    END IF;
  END IF;
  
  -- Update bet status
  UPDATE public.straight_bets
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 