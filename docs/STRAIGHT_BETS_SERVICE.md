# Straight Bets Service Documentation

## Overview
The `straightBetsService.ts` replaces the deprecated `bettingService.ts` and `betStorageService.ts` files with a unified, database-backed approach for straight bet operations.

## Key Changes
- **Database-first**: All operations use the `straight_bets` table directly
- **No mock data**: Eliminates fallback to mock data arrays
- **Proper field mapping**: Interface fields match database columns exactly
- **Integrated validation**: Built-in validation for matches and picks
- **Points integration**: Automatic points reservation on bet creation

## Interface
```typescript
export interface StraightBet {
  id: string; // UUID
  creatorId: string; // UUID - references user_accounts(id)
  matchId: string; // UUID - references matches(id)  
  creatorsPickId: string; // TEXT - team/player ID the creator is betting on
  amount: number; // DECIMAL(10,2) - amount being wagered
  amountCurrency: 'points'; // currency_type enum
  creatorsNote?: string; // TEXT - optional note from creator
  acceptorId?: string; // UUID - references user_accounts(id), null if not accepted
  acceptorsPickId?: string; // TEXT - team/player ID the acceptor is betting on
  status: StraightBetStatus; // bet_status enum
  winnerUserId?: string; // UUID - references user_accounts(id), null if not completed
  
  // Timestamps
  createdAt: string; // TIMESTAMP WITH TIME ZONE
  updatedAt: string; // TIMESTAMP WITH TIME ZONE
  acceptedAt?: string; // TIMESTAMP WITH TIME ZONE, null if not accepted
  completedAt?: string; // TIMESTAMP WITH TIME ZONE, null if not completed
}
```

**Note:** The interface uses TypeScript camelCase conventions. The service handles mapping between camelCase (TypeScript) and snake_case (database) internally.

## Functions

### `createStraightBet()`
Creates a new straight bet in the database.

**Parameters:**
- `creatorId: string` - User ID of the bet creator
- `matchId: string` - ID of the match being bet on
- `creatorsPickId: string` - ID of the team/pick the creator is betting on
- `amount: number` - Amount of points being wagered
- `creatorsNote?: string` - Optional description/note for the bet

**Returns:** `Promise<StraightBet>`

### `createStraightBetWithValidation()`
Creates a straight bet with comprehensive validation including match existence and pick validation.

**Parameters:** Same as `createStraightBet()` plus:
- `validateInputs: boolean = true` - Whether to perform validation

**Returns:** `Promise<StraightBet>`

## Migration Notes
When updating existing code:
1. Replace `bettingService.createBet()` calls with `createStraightBet()`
2. Update field references:
   - `creator` → `creatorId`
   - `matchId` → `matchId` (unchanged)
   - `teamId` → `creatorsPickId`
   - `description` → `creatorsNote`
   - `timestamp` → `createdAt`
   - `acceptor` → `acceptorId`
   - `winnerId` → `winnerUserId`
3. Handle timestamp format change (string vs number)
4. Update validation logic to use new validation functions 