# User Accounts System

This document describes the `user_accounts` table structure in the AgentDD application.

## Table Structure

### `user_accounts` Table

```sql
CREATE TABLE public.user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reserved_points DECIMAL(18,8) DEFAULT 0,
  free_points DECIMAL(18,8) DEFAULT 0
);
```

### Key Features

1. `id` is the primary key
2. `user_id` references the Supabase auth.users table
3. Points are split into two columns:
   - `reserved_points`: Points that are reserved (e.g., held in escrow) and can no longer be spent
   - `free_points`: Points that are not yet reserved and can still be spent
4. **Signup bonuses**: The default `free_points` is 0 because signup bonuses (500 points) are awarded automatically via database triggers rather than default column values

## Signup Bonus System

New users receive 500 DARE points through database-level automation:

- **Email signups**: `insert_rows_after_signup_from_email()` trigger automatically awards 500 points when `auth.users` record is created
- **Wallet signups**: `insertRowsAfterSignupFromWallet()` RPC function awards 500 points when called from frontend

Both methods create the user account with the appropriate points balance and record the SIGNUP transaction atomically.

## Database Initialization

The `user_accounts` table is created manually in Supabase by running the SQL migrations directly.

## API Functions

### Points Management Functions

The following functions have been added to handle the split DARE points:

- `getUserFreePoints()`: Get free points
- `getUserReservedPoints()`: Get reserved points
- `reservePoints()`: Move points from free to reserved
- `freePoints()`: Move points from reserved to free

### Core Functions

The following functions manage user accounts:

- `getTotalUserPoints()`: Returns the sum of reserved and free points
- `updatePoints()`: Updates only free points
- `adjustUserPoints()`: Checks against free points
- `deductBetPoints()`: Reserves points instead of deducting them

## UI Components

The DARE Points display shows:

1. Total points (sum of reserved and free)
2. Free points
3. Reserved points (if any)

## Migration Files

- `002_create_user_accounts_table.sql`: Creates the user_accounts table

## Services

- `setupDatabaseService.ts`: Contains SQL functions for leaderboards
- `supabaseService.ts`: Provides functions for interacting with the user_accounts table
- `pointsService.ts`: Manages DARE points operations

## Context

- `PointsContext.tsx`: Tracks both reserved and free points

## Components

- `PointsDisplay.tsx`: Shows both reserved and free points 