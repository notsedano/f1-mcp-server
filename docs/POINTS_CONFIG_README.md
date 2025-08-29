# Points Configuration System

This document describes the configuration system for points values in the AgentDD application.

## Overview

The points configuration system allows for dynamic management of point values awarded for different actions in the application. Rather than hardcoding these values, they are stored in a database table and can be modified by administrators. All changes to point values are tracked in a history table for auditing purposes.

## Key Concepts

- **Dynamic Configuration**: Point values are stored in the database and can be changed without code deployment
- **Audit Trail**: All changes to point values are automatically tracked with timestamps and reasons
- **Type Safety**: Uses the `points_transaction_type` enum to ensure consistency
- **Admin Controls**: Only administrators can modify point values

## Configuration Overview

The system stores configurable point values for different transaction types. For the complete list of transaction types and their current default values, see:
- `supabase_migrations/004_create_points_config_tables.sql` for the schema and initial values
- `src/types/points.ts` for TypeScript type definitions

**Key principle**: Bonus-awarding actions have configurable point values, while balance transfer actions (like `BET_PLACED`, `BET_WON`, `BET_LOST`) have zero values since they move existing points rather than create new ones.

## Using the Configuration System

Use the configuration service functions to access and modify point values:

### Getting Current Point Values

```typescript
import { getPointValueForAction } from '../services/pointsConfigService';

// Get configured point values
const signupBonus = await getPointValueForAction('SIGNUP');
const dailyLoginBonus = await getPointValueForAction('DAILY_LOGIN');
const betPlacementBonus = await getPointValueForAction('BET_PLACEMENT_BONUS_AWARDED');
```

### Updating Point Values (Admin Only)

```typescript
import { updatePointValue } from '../services/pointsConfigService';

// Update configuration values (admin only)
await updatePointValue('SIGNUP', 750, 'Promotional signup bonus increase');
await updatePointValue('DAILY_LOGIN', 10, 'Boosting daily engagement');
```

**Note**: Point value updates automatically call `update_points_value()` SQL function and create history records. See service function definitions for implementation details.

## Viewing Configuration History

```typescript
import { getConfigurationHistory } from '../services/pointsConfigService';

// View configuration change history
const signupHistory = await getConfigurationHistory('SIGNUP');
const allRecentChanges = await getConfigurationHistory(); // All recent changes
```

## Admin Interface

The application should provide an admin interface for managing point values. This interface should:

1. Display all current point values
2. Allow admins to update point values
3. Require a reason for each change
4. Show a history of all changes

## Integration with Transactions

The configuration system automatically integrates with point-awarding functions:

```typescript
import { 
  awardReferralBonus,
  awardDailyLoginBonus,
  awardBetAcceptanceBonus,
  awardBetWinBonus
} from '../services/pointsConfigService';

// These functions automatically use current configured values
await awardReferralBonus(referrerId, newUserId, referralCode);
await awardDailyLoginBonus(userId);
await awardBetAcceptanceBonus(bettorUserId, acceptorUserId, betId);
await awardBetWinBonus(userId, betId);
```

**Note**: Signup bonuses are now handled automatically by database triggers:
- **Email signups**: `insert_rows_after_signup_from_email()` trigger function
- **Wallet signups**: `insertRowsAfterSignupFromWallet()` RPC function  

Both methods automatically use the configured SIGNUP point value from the database.

Point values can be changed in the database without code deployment - the functions always use current configured amounts.

## Security Considerations

- Only administrators can modify point values
- All users can view current point values
- All changes are tracked with user ID and timestamp
- A reason is required for each change 