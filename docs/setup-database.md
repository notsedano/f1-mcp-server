# Database Setup Guide

This guide will help you set up the points system database tables using Supabase CLI.

## Prerequisites
- ✅ Supabase CLI installed 
- ✅ Migration files copied to `supabase/migrations/`
- 🔲 Supabase project created at https://supabase.com
- 🔲 Project reference ID from your Supabase dashboard

## Steps

### 1. Link to your Supabase project
Replace `YOUR_PROJECT_REF` with your actual project reference from the Supabase dashboard:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for your database password. You can find this in your Supabase project settings.

### 2. Check current database state
```bash
supabase db diff
```

This will show you what changes will be applied.

### 3. Apply the migrations
```bash
supabase db push
```

This will run all the migration files in order:
- `001_create_matches_table.sql` - Creates matches table
- `002_create_user_accounts_table.sql` - Creates user accounts table  
- `003_create_points_transactions_table.sql` - Creates transactions table and enums
- `004_create_points_config_tables.sql` - Creates config table and functions
- `005_create_auth_triggers.sql` - Creates database triggers for automatic signup bonuses

### 4. Verify the setup
After successful migration, you should have:

**Tables:**
- `matches` - Sports match data
- `user_accounts` - User profile and points balances
- `points_transactions` - Transaction history
- `points_config` - Configurable point values
- `points_config_history` - Config change history

**Functions:**
- `get_points_value(action)` - Get configured point value
- `update_points_value(action, value, reason)` - Update point values
- `insert_rows_after_signup_from_email()` - Database trigger for email signups
- `insert_rows_after_signup_from_wallet()` - RPC function for wallet signups

**Triggers:**
- `on_auth_user_created` - Automatically fires when new user created via email signup

**Initial Configuration:**
- SIGNUP: 500 points
- REFERRAL_BONUS: 100 points  
- BET_ACCEPTANCE_BONUS_AWARDED: 15 points
- BET_WIN_BONUS_AWARDED: 50 points
- DAILY_LOGIN: 5 points

### 5. Test the setup
You can test by creating a new user account through your app. The signup process should:

**Email Signups:**
1. Create user in `auth.users` table
2. Database trigger automatically fires
3. Creates user account in `user_accounts` with 500 points
4. Creates transaction record in `points_transactions` with type 'SIGNUP'

**Wallet Signups:**
1. Frontend calls `insertRowsAfterSignupFromWallet()` RPC function
2. Database function executes with elevated privileges
3. Creates user account in `user_accounts` with 500 points
4. Creates transaction record in `points_transactions` with type 'SIGNUP'

## Troubleshooting

**If you get permission errors:**
Make sure you're using the correct database password from your Supabase project settings.

**If migrations fail:**
1. Check that all files are in `supabase/migrations/`
2. Run `supabase db diff` to see what conflicts exist
3. You may need to reset and start fresh if there are conflicts

**To reset and start over:**
```bash
supabase db reset
supabase db push
```

## Next Steps
Once the database is set up, your signup bonus system will be fully functional:
- Email signups automatically get 500 points via database trigger
- Wallet signups automatically get 500 points via RPC function
- All transactions are recorded for audit purposes
- Point values are configurable via the admin interface
- No permission errors due to elevated database function privileges 