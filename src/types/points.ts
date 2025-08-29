// TypeScript enums that match the SQL enums exactly
export type PointsTransactionType = 
  | 'BET_PLACED'
  | 'BET_ACCEPTANCE_BONUS_AWARDED' 
  | 'BET_WON'
  | 'BET_WIN_BONUS_AWARDED'
  | 'BET_LOST'
  | 'SIGNUP'
  | 'REFERRAL_BONUS'
  | 'DAILY_LOGIN';

export type PointsBalanceType = 'FREE' | 'RESERVED';

// Metadata interface for transaction details
export interface PointsTransactionMetadata {
  // For bet-related transactions
  bet_id?: string;
  match_id?: string;
  team_bet_on?: string;
  odds?: number;
  
  // For referral transactions
  referred_user_id?: string;
  referrer_user_id?: string;
  
  // For promotional transactions
  promotion_id?: string;
  promotion_name?: string;
  
  // For admin adjustments
  admin_user_id?: string;
  admin_reason?: string;
  
  // General purpose fields
  description?: string;
  source?: string;
  external_reference?: string;
  
  // Future extensibility
  [key: string]: any;
}

// Transaction record interface for database operations
export interface PointsTransactionRecord {
  id: string;
  transaction_type: PointsTransactionType;
  balance_type: PointsBalanceType;
  amount: number;
  created_at: string;
  metadata?: PointsTransactionMetadata;
} 