import { PointsTransactionType } from '../../types/points';
import { supabase } from '../../services/supabaseService';

/**
 * Interface for Points Configuration
 */
export interface PointsConfig {
  action_type: PointsTransactionType;
  point_value: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Interface for Points Configuration History
 */
export interface PointsConfigHistory {
  id: string;
  action_type: PointsTransactionType;
  point_value: number;
  changed_by_user_id: string;
  effective_from: string;
  effective_to?: string;
  created_at: string;
}

/**
 * Get all active point configurations
 */
export const getAllPointConfigs = async (): Promise<PointsConfig[]> => {
  try {
    const { data, error } = await supabase
      .from('active_points_config')
      .select('*')
      .eq('is_active', true);
      
    if (error) {
      console.error('Error fetching point configurations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching point configurations:', error);
    return [];
  }
};

/**
 * Get point value for a specific action type
 */
export const getPointValue = async (actionType: PointsTransactionType): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_points_value', { action: actionType });
      
    if (error) {
      console.error('Error fetching point value:', error);
      return 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error fetching point value:', error);
    return 0;
  }
};

/**
 * Update point value for a specific action type
 */
export const updatePointValue = async (
  actionType: PointsTransactionType,
  newValue: number,
  changedByUserId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .rpc('update_points_value', {
        action: actionType,
        new_value: newValue,
        changed_by: changedByUserId
      });
      
    if (error) {
      console.error('Error updating point value:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating point value:', error);
    return false;
  }
};

/**
 * Get configuration history for an action type
 */
export const getConfigHistory = async (actionType?: PointsTransactionType): Promise<PointsConfigHistory[]> => {
  try {
    let query = supabase
      .from('points_config_history')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error fetching config history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching config history:', error);
    return [];
  }
};

/**
 * Award points based on configured action values
 * This function retrieves the configured point value for the specified action
 * and awards those points to the user.
 * 
 * Process:
 * 1. GET configured point value for the action type
 * 2. AWARD that amount to the user (via pointsService)
 * 3. RECORD transaction in points_transactions table
 * 
 * @param userId - ID of the user to award points to
 * @param actionType - Type of action that triggers the point award
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const awardPointsByAction = async (
  userId: string,
  actionType: PointsTransactionType
): Promise<boolean> => {
  try {
    // Get the configured point value for this action
    const pointsAmount = await getPointValue(actionType);
    
    if (pointsAmount <= 0) {
      console.log(`No points configured for action type: ${actionType}`);
      return false;
    }
    
         // Import the service functions to avoid circular dependencies
     const {
       getUserFreePoints,
       recordTransaction
     } = await import('./pointsService');
     const { updatePoints } = await import('../../services/supabaseService');
    
    // Get user's current free points
    const freePoints = await getUserFreePoints(userId);
    
         // Award the configured amount  
     const newTotal = await updatePoints(userId, pointsAmount);
     const success = newTotal > freePoints;
    
    if (success) {
      // Record the transaction
      await recordTransaction(
        userId,
        actionType,
        'FREE',
        pointsAmount,
        `Awarded ${pointsAmount} points for ${actionType}`,
        { 
          source: 'config_based_award',
          action_type: actionType,
          configured_amount: pointsAmount
        }
      );
      
      console.log(`Successfully awarded ${pointsAmount} points to user ${userId} for ${actionType}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error awarding points by action:', error);
    return false;
  }
};

/**
 * Award signup bonus points to a new user
 * This is a convenience function that awards the configured SIGNUP bonus
 * 
 * Database operations performed:
 * 1. GET configured SIGNUP point value from points_config
 * 2. UPDATE user's free_points (+configured_amount)
 * 3. INSERT SIGNUP transaction into points_transactions
 * 
 * @param userId - ID of the new user to award signup bonus to
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const awardSignupBonus = async (userId: string): Promise<boolean> => {
  return await awardPointsByAction(userId, 'SIGNUP');
};

/**
 * Award referral bonus
 */
export const awardReferralBonus = async (
  referrerId: string, 
  newUserId: string,
  referralCode: string
): Promise<boolean> => {
     return awardPointsByAction(
     referrerId, 
     'REFERRAL_BONUS'
   );
};

/**
 * Award bet acceptance bonus to both bettor and acceptor
 */
export const awardBetAcceptanceBonus = async (
  bettorUserId: string,
  acceptorUserId: string, 
  betId: string,
  matchId?: string
): Promise<boolean> => {
  try {
    // Award bonus to both the bettor and acceptor
    const bettorSuccess = await awardPointsByAction(bettorUserId, 'BET_ACCEPTANCE_BONUS_AWARDED');
    const acceptorSuccess = await awardPointsByAction(acceptorUserId, 'BET_ACCEPTANCE_BONUS_AWARDED');
    
    return bettorSuccess && acceptorSuccess;
  } catch (error) {
    console.error('Error awarding bet acceptance bonus:', error);
    return false;
  }
};

/**
 * Award bet win bonus
 */
export const awardBetWinBonus = async (
  userId: string, 
  betId: string,
  matchId?: string
): Promise<boolean> => {
     return awardPointsByAction(
     userId, 
     'BET_WIN_BONUS_AWARDED'
   );
};

/**
 * Award daily login bonus
 */
export const awardDailyLoginBonus = async (userId: string): Promise<boolean> => {
  return awardPointsByAction(
    userId, 
    'DAILY_LOGIN'
  );
}; 