# Points Transactions System

This document describes how to use the `points_transactions` table to track all points movements in the AgentDD application.

## Overview

The transactions table provides a complete audit trail of all points movements. For the table structure and transaction type definitions, see the migration files:
- `supabase_migrations/003_create_points_transactions_table.sql`
- `src/types/points.ts` for TypeScript definitions

## Key Concepts

**Transaction-Based Audit**: Every points movement creates a transaction record, allowing complete traceability by summing transactions.

**Balance Types**: Transactions specify whether they affect `FREE` or `RESERVED` balance.

**Event Grouping**: Related transactions share a `common_event_id` to group multi-step operations.

**Metadata**: Transaction-specific information is stored in JSONB metadata field.

## Key Features

1. **Transaction-Based Audit Trail**: Each transaction records the amount and direction of points movement, allowing for complete traceability by summing transactions.

2. **Balance Type Tracking**: The `balance_type` field explicitly specifies which balance is affected by the transaction (FREE or RESERVED).

3. **Separate Transaction Records**: When an action affects both free and reserved balances, multiple transaction records are created with the same `common_event_id`.

4. **Signed Amounts**: The `amount` field uses positive values for additions and negative values for subtractions, making the direction of the transaction clear.

5. **Flexible Metadata**: The `metadata` JSONB field stores conditional information based on transaction type:
   - `related_user_id`: Another user involved in the transaction (e.g., bet opponent, referrer)
   - `bet_id`: ID of the bet related to this transaction
   - `match_id`: ID of the match related to this transaction
   - `referral_code`: Referral code used for referral transactions
   - `description`: Human-readable description of the transaction

6. **Event Grouping**: The `common_event_id` field allows grouping multiple transactions that result from the same event (e.g., a bet settlement creates multiple transaction records).

## How to Use the Transaction System

The transaction system is accessed through high-level service functions that handle all the database operations automatically. Components should never write SQL directly.

### 1. Betting Functions

```typescript
import { 
  deductBetPoints, 
  awardBetWinPoints, 
  awardBetAcceptanceBonus,
  awardBetWinBonus 
} from '../services/pointsService';

// When user places a bet (no bonus awarded)
const success = await deductBetPoints(userId, betAmount, betId);

// When another user accepts a bet (bonus awarded to both users)
if (betAccepted) {
  await awardBetAcceptanceBonus(bettorUserId, acceptorUserId, betId, matchId);
}

// When user wins a bet
const winSuccess = await awardBetWinPoints(userId, winAmount, betId);
if (winSuccess) {
  // Award win bonus
  await awardBetWinBonus(userId, betId, matchId);
}
```

### 2. User Lifecycle Functions

```typescript
import { 
  awardSignupBonus,
  awardReferralBonus,
  awardDailyLoginBonus,
  awardBetAcceptanceBonus 
} from '../services/pointsConfigService';

// When new user signs up
await awardSignupBonus(userId);

// When someone uses a referral code
await awardReferralBonus(referrerId, newUserId, referralCode);

// Daily login bonus
await awardDailyLoginBonus(userId);

// Bet acceptance bonus (awarded to both users when a bet is accepted)
await awardBetAcceptanceBonus(bettorUserId, acceptorUserId, betId, matchId);
```

### 3. Manual Adjustments

```typescript
import { awardPoints } from '../services/pointsService';

// Admin manual adjustment
await awardPoints(userId, adjustmentAmount, 'Customer service adjustment');
```

**Note**: Each function automatically handles creating the appropriate transaction records, updating balances, and maintaining audit trails. See the function definitions for implementation details.

## Integration with Existing System

The `points_transactions` table complements the existing `user_accounts` table by providing a detailed audit trail of all points movements. While the `user_accounts` table maintains the current balance state, the transactions table records how that state changed over time.

## Querying Transaction Data

Use the following service functions to access transaction data:

### Get User Balances

```typescript
import { 
  getUserFreePoints, 
  getUserReservedPoints,
  getTotalUserPoints 
} from '../services/pointsService';

// Get current balances
const freeBalance = await getUserFreePoints(userId);
const reservedBalance = await getUserReservedPoints(userId);
const totalBalance = await getTotalUserPoints(userId);
```

### Get Transaction History

```typescript
import { getUserTransactions } from '../services/pointsService';

// Get user's transaction history
const transactions = getUserTransactions(userId);

// Filter transactions by type
const bonusTransactions = transactions.filter(t => 
  t.type === 'REWARD' && t.amount > 0
);

// Filter transactions by bet
const betTransactions = transactions.filter(t => 
  t.betId === 'specific-bet-id'
);
```

**Note**: For complex queries or analytics, implement additional service functions rather than writing SQL directly in components.

## Security Considerations

The table uses Row Level Security (RLS) to ensure users can only view their own transactions or transactions where they are the related user. System-level services can insert transactions for any user to facilitate point transfers and adjustments.

## Integration with Configuration Service

The transaction service automatically integrates with the configuration system to use current configured point values:

```typescript
import { 
  awardReferralBonus,
  awardDailyLoginBonus,
  awardBetAcceptanceBonus,
  awardBetWinBonus
} from '../services/pointsConfigService';

// These functions use current configured values and create appropriate transactions
await awardReferralBonus(referrerId, newUserId, referralCode);
await awardDailyLoginBonus(userId);
await awardBetAcceptanceBonus(bettorUserId, acceptorUserId, betId);
await awardBetWinBonus(userId, betId);
```

**Note**: Signup bonuses are now handled automatically by database triggers and don't require manual service function calls:
- **Email signups**: Database trigger `insert_rows_after_signup_from_email()` automatically creates user account and SIGNUP transaction
- **Wallet signups**: RPC function `insertRowsAfterSignupFromWallet()` handles account creation and SIGNUP transaction

Both methods ensure atomic operations and proper transaction recording. 