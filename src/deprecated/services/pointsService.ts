import { supabase } from '../../services/supabaseService';
import {
  getUserAccount,
  updateUserAccount,
  getFreePoints as getSupabaseFreePoints,
  getReservedPoints as getSupabaseReservedPoints,
  reservePoints as supabaseReservePoints,
  freePoints as supabaseFreePoints,
  updatePoints
} from '../../services/supabaseService';
import { PointsTransactionRecord } from '../../types/points';

// Default starting points
export const DEFAULT_POINTS = 500;

// Local storage key for caching points
export const LOCAL_STORAGE_KEY = 'points_cache';

// Transaction interface for backward compatibility with existing code
export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'BET_PLACED' | 'BET_WON' | 'REWARD' | 'DEPOSIT' | 'WITHDRAWAL';
  description: string;
  betId?: string;
  timestamp: number;
}

/**
 * Ensure the user_accounts table exists (simplified version)
 */
export const ensurePointsStructure = async (): Promise<void> => {
  try {
    // Simple check if user_accounts table is accessible
    const { error } = await supabase.from('user_accounts').select('id').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (table exists but empty)
      console.error('Points structure check failed:', error);
    }
  } catch (error) {
    console.error('Exception checking points structure:', error);
  }
};

/**
 * Get user's total points (free + reserved) - renamed from getUserDarePoints
 */
export const getTotalUserPoints = async (userId: string): Promise<number> => {
  try {
    await ensurePointsStructure();
    
    const account = await getUserAccount(userId);
    
    if (account) {
      const totalPoints = (account.free_points || 0) + (account.reserved_points || 0);
      
      // Cache to local storage
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: totalPoints,
          free: account.free_points || 0,
          reserved: account.reserved_points || 0,
          timestamp: Date.now() 
        })
      );
      
      return totalPoints;
    }
    
    // If account exists but points columns don't exist, initialize them
    if (account && (!('free_points' in account) || !('reserved_points' in account))) {
      try {
        await updateUserAccount(userId, { 
          free_points: DEFAULT_POINTS,
          reserved_points: 0
        });
        
        localStorage.setItem(
          `${LOCAL_STORAGE_KEY}_${userId}`, 
          JSON.stringify({ 
            total: DEFAULT_POINTS,
            free: DEFAULT_POINTS,
            reserved: 0,
            timestamp: Date.now() 
          })
        );
        
        return DEFAULT_POINTS;
      } catch (updateError) {
        console.error('Error initializing points:', updateError);
      }
    }
    
    // Fallback to local storage
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { total } = JSON.parse(cached);
      return total;
    }
    
    return DEFAULT_POINTS;
  } catch (error) {
    console.error('Error fetching total points:', error);
    
    // Try local cache on error
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { total } = JSON.parse(cached);
      return total;
    }
    
    return DEFAULT_POINTS;
  }
};

/**
 * Get user's free points
 */
export const getUserFreePoints = async (userId: string): Promise<number> => {
  try {
    await ensurePointsStructure();
    return await getSupabaseFreePoints(userId);
  } catch (error) {
    console.error('Error fetching free points:', error);
    
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { free } = JSON.parse(cached);
      return free || 0;
    }
    
    return 0;
  }
};

/**
 * Get user's reserved points
 */
export const getUserReservedPoints = async (userId: string): Promise<number> => {
  try {
    await ensurePointsStructure();
    return await getSupabaseReservedPoints(userId);
  } catch (error) {
    console.error('Error fetching reserved points:', error);
    
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { reserved } = JSON.parse(cached);
      return reserved || 0;
    }
    
    return 0;
  }
};

/**
 * Reserve points (move from free to reserved)
 */
export const reservePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    return await supabaseReservePoints(userId, amount);
  } catch (error) {
    console.error('Error reserving points:', error);
    return false;
  }
};

/**
 * Free points (move from reserved to free)
 */
export const freePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    return await supabaseFreePoints(userId, amount);
  } catch (error) {
    console.error('Error freeing points:', error);
    return false;
  }
};

/**
 * Record a points transaction in the database
 */
export const recordTransaction = async (
  userId: string,
  transactionType: string,
  balanceType: 'FREE' | 'RESERVED',
  amount: number,
  description: string,
  metadata?: any
): Promise<boolean> => {
  try {
    const commonEventId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('points_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        balance_type: balanceType,
        amount: amount,
        common_event_id: commonEventId,
        metadata: metadata || {}
      });
    
    if (error) {
      console.error('Error recording transaction:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording transaction:', error);
    return false;
  }
};

/**
 * Get user's transaction history from the database
 */
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
    
    // Convert database format to Transaction format for backward compatibility
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      type: row.transaction_type,
      description: `${row.transaction_type}: ${row.amount} points`,
      betId: row.metadata?.bet_id,
      timestamp: new Date(row.created_at).getTime()
    }));
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

/**
 * Add points for a bet win
 */
export const addBetWinPoints = async (userId: string, amount: number, betId: string): Promise<boolean> => {
  try {
    const currentPoints = await getUserFreePoints(userId);
    const newTotal = currentPoints + amount;
    
    // Update points using the supabase service
    await updatePoints(userId, newTotal);
    
    // Record the transaction
    await recordTransaction(
      userId,
      'BET_WON',
      'FREE',
      amount,
      `Won ${amount} points from bet ${betId}`,
      { bet_id: betId }
    );
    
    return true;
  } catch (error) {
    console.error('Error adding bet win points:', error);
    return false;
  }
};

/**
 * Deduct points for placing a bet
 */
export const deductBetPoints = async (userId: string, amount: number, betId: string): Promise<boolean> => {
  try {
    const currentPoints = await getUserFreePoints(userId);
    
    if (currentPoints < amount) {
      return false; // Insufficient points
    }
    
    // Reserve the points instead of deducting them
    const reserved = await reservePoints(userId, amount);
    
    if (reserved) {
      // Record the transaction
      await recordTransaction(
        userId,
        'BET_PLACED',
        'RESERVED',
        amount,
        `Placed a bet of ${amount} points`,
        { bet_id: betId }
      );
    }
    
    return reserved;
  } catch (error) {
    console.error('Error deducting bet points:', error);
    return false;
  }
};

/**
 * Award points for various actions
 */
export const awardPoints = async (userId: string, amount: number, reason: string): Promise<boolean> => {
  try {
    const currentPoints = await getUserFreePoints(userId);
    const newTotal = currentPoints + amount;
    
    // Update points
    await updatePoints(userId, newTotal);
    
    // Record the transaction
    await recordTransaction(
      userId,
      'REWARD',
      'FREE',
      amount,
      reason,
      { source: 'award' }
    );
    
    return true;
  } catch (error) {
    console.error('Error awarding points:', error);
    return false;
  }
}; 