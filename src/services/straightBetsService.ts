/**
 * Straight Bets Service - Atomic bet operations with integrated points management
 * 
 * This service handles straight bet operations with complete atomicity.
 * Each business operation (create, accept, delete) includes:
 * - Points transaction recording
 * - Balance updates  
 * - Bet record management
 * - Bonus award tracking
 * 
 * All operations are atomic - either all succeed or all fail.
 */

import { createClient } from '@supabase/supabase-js';
import { pointModifiableActionConfigurationsService } from './pointModifiableActionConfigurationsService';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client with connection pooling
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-app-name': 'agentdd-web' },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Point transaction types from our new enum
export type PointTransactionType = 
  | 'CREATED_STRAIGHT_BET'
  | 'ACCEPTED_STRAIGHT_BET'
  | 'RECEIVED_BONUS_FOR_MATCHING_STRAIGHT_BET'
  | 'DELETED_STRAIGHT_BET'
  | 'UNDO_BONUS_FOR_MATCHING_STRAIGHT_BET'
  | 'WON_STRAIGHT_BET'
  | 'RECEIVED_BONUS_FOR_WINNING_STRAIGHT_BET'
  | 'LOST_STRAIGHT_BET'
  | 'RECEIVED_BONUS_FOR_CREATING_NEW_ACCOUNT'
  | 'RECEIVED_BONUS_FOR_REFERRING_NEW_USER'
  | 'RECEIVED_BONUS_FOR_LOGGING_IN_FOR_THE_FIRST_TIME_TODAY';

export type PointBalanceType = 'FREE' | 'RESERVED';

// Straight bet status enum - matches database bet_status enum
export enum StraightBetStatus {
  OPEN = 'open',
  WAITING_RESULT = 'waiting_result',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Straight bet interface - uses TypeScript camelCase conventions
export interface StraightBet {
  id: string;
  creatorUserId: string;
  creatorUsername: string;
  matchId: string;
  creatorsPickId: string;
  amount: number;
  amountCurrency: 'points';
  creatorsNote?: string;
  acceptorUserId?: string;
  acceptorUsername?: string;
  acceptorsPickId?: string;
  status: StraightBetStatus;
  winnerUserId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface CreateStraightBetRequest {
  matchId: string;
  creatorsPickId: string;
  amount: number;
  creatorsNote?: string;
}

class StraightBetsService {
  /**
   * Create a straight bet atomically
   * - Validates user has sufficient points
   * - Records point transactions (free -> reserved)
   * - Updates user balance
   * - Creates bet record
   */
  async createStraightBet(
    user_id: string,
    bet_data: CreateStraightBetRequest
  ): Promise<StraightBet> {
    const common_event_id = uuidv4();
    const bet_id = uuidv4();
    
    try {
      const { data: result, error } = await supabase.rpc('create_straight_bet_atomic', {
        p_user_id: user_id,
        p_bet_id: bet_id,
        p_match_id: bet_data.matchId,
        p_creators_pick_id: bet_data.creatorsPickId,
        p_amount: bet_data.amount,
        p_creators_note: bet_data.creatorsNote || null,
        p_common_event_id: common_event_id
      });

      if (error) {
        throw new Error(`Failed to create bet: ${error.message}`);
      }

      return this.mapDatabaseBetToInterface(result);
    } catch (error) {
      console.error('Error creating straight bet:', error);
      throw error;
    }
  }

  /**
   * Accept a straight bet atomically
   * - Validates user has sufficient points
   * - Validates bet is still open
   * - Records point transactions for acceptor
   * - Updates both users' balances
   * - Awards matching bonuses to both users
   * - Updates bet record
   */
  async acceptStraightBet(
    user_id: string,
    bet_id: string,
    acceptors_pick_id: string
  ): Promise<void> {
    const common_event_id = uuidv4();
    
    try {
      const { error } = await supabase.rpc('accept_straight_bet_atomic', {
        p_user_id: user_id,
        p_bet_id: bet_id,
        p_acceptors_pick_id: acceptors_pick_id,
        p_common_event_id: common_event_id
      });

      if (error) {
        throw new Error(`Failed to accept bet: ${error.message}`);
      }
    } catch (error) {
      console.error('Error accepting straight bet:', error);
      throw error;
    }
  }

  /**
   * Delete a straight bet atomically
   * - Validates bet can be deleted (open status)
   * - Refunds reserved points to both users
   * - Reverses any matching bonuses
   * - Updates bet status to cancelled
   */
  async deleteStraightBet(bet_id: string): Promise<void> {
    const common_event_id = uuidv4();
    
    try {
      const { error } = await supabase.rpc('delete_straight_bet_atomic', {
        p_bet_id: bet_id,
        p_common_event_id: common_event_id
      });

      if (error) {
        throw new Error(`Failed to delete bet: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting straight bet:', error);
      throw error;
    }
  }

  /**
   * Get user's straight bets
   */
  async getUserStraightBets(user_id: string, status?: StraightBetStatus): Promise<StraightBet[]> {
    try {
      let query = supabase
        .from('straight_bets')
        .select('*')
        .or(`creator_user_id.eq.${user_id},acceptor_user_id.eq.${user_id}`)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch user bets: ${error.message}`);
      }

      return (data || []).map(bet => this.mapDatabaseBetToInterface(bet));
    } catch (error) {
      console.error('Error getting user straight bets:', error);
      throw error;
    }
  }

  /**
   * Get open straight bets for a specific match
   */
  async getOpenStraightBetsForMatch(match_id: string): Promise<StraightBet[]> {
    try {
      const { data, error } = await supabase
        .from('straight_bets')
        .select('*')
        .eq('match_id', match_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch open bets for match: ${error.message}`);
      }

      return (data || []).map(bet => this.mapDatabaseBetToInterface(bet));
    } catch (error) {
      console.error('Error getting open bets for match:', error);
      throw error;
    }
  }

  /**
   * Get all open straight bets (for compatibility with existing code)
   */
  async getOpenStraightBets(limit: number = 100): Promise<StraightBet[]> {
    try {
      const { data, error } = await supabase
        .from('straight_bets')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch open bets: ${error.message}`);
      }

      return (data || []).map(bet => this.mapDatabaseBetToInterface(bet));
    } catch (error) {
      console.error('Error getting open straight bets:', error);
      throw error;
    }
  }

  /**
   * Get straight bets by status
   * @param status - The bet status to filter by
   * @param limit - Maximum number of bets to return (default: 100)
   * @returns Promise<StraightBet[]> - Array of bets with the specified status
   */
  async getStraightBetsByStatus(status: StraightBetStatus, limit: number = 100): Promise<StraightBet[]> {
    try {
      const { data, error } = await supabase
        .from('straight_bets')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch bets with status ${status}: ${error.message}`);
      }

      return (data || []).map(bet => this.mapDatabaseBetToInterface(bet));
    } catch (error) {
      console.error('Error getting straight bets by status:', error);
      throw error;
    }
  }

  /**
   * Map database record to TypeScript interface
   */
  private mapDatabaseBetToInterface(dbBet: any): StraightBet {
    return {
      id: dbBet.id,
      creatorUserId: dbBet.creator_user_id,
      creatorUsername: dbBet.creator_username,
      matchId: dbBet.match_id,
      creatorsPickId: dbBet.creators_pick_id,
      amount: dbBet.amount,
      amountCurrency: dbBet.amount_currency,
      creatorsNote: dbBet.creators_note || undefined,
      acceptorUserId: dbBet.acceptor_user_id || undefined,
      acceptorUsername: dbBet.acceptor_username || undefined,
      acceptorsPickId: dbBet.acceptors_pick_id || undefined,
      status: dbBet.status as StraightBetStatus,
      winnerUserId: dbBet.winner_user_id || undefined,
      createdAt: dbBet.created_at,
      updatedAt: dbBet.updated_at,
      acceptedAt: dbBet.accepted_at || undefined,
      completedAt: dbBet.completed_at || undefined
    };
  }
}

// Export singleton instance
export const straightBetsService = new StraightBetsService();

// Legacy exports for backward compatibility during migration
export const createStraightBet = straightBetsService.createStraightBet.bind(straightBetsService);
export const acceptStraightBet = straightBetsService.acceptStraightBet.bind(straightBetsService);
export const getUserStraightBets = straightBetsService.getUserStraightBets.bind(straightBetsService);
export const getOpenStraightBets = straightBetsService.getOpenStraightBets.bind(straightBetsService);
export const getStraightBetsByStatus = straightBetsService.getStraightBetsByStatus.bind(straightBetsService);

// Validation function for bet creation (used by components)
export const createStraightBetWithValidation = async (
  creatorUserId: string,
  matchId: string,
  creatorsPickId: string,
  amount: number,
  creatorsNote?: string,
  enableValidation: boolean = true
): Promise<StraightBet> => {
  if (enableValidation) {
    if (!creatorUserId || !matchId || !creatorsPickId) {
      throw new Error('Missing required parameters: creatorUserId, matchId, and creatorsPickId are required');
    }

    if (amount <= 0) {
      throw new Error('Bet amount must be greater than 0');
    }
  }

  return await straightBetsService.createStraightBet(creatorUserId, {
    matchId,
    creatorsPickId,
    amount,
    creatorsNote
  });
};