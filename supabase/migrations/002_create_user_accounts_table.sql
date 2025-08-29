-- Migration: Create user_accounts table
-- This creates a user accounts table that stores wallet addresses and point balances

-- Create function to generate unique usernames with collision handling
CREATE OR REPLACE FUNCTION generate_unique_username()
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Quick', 'Silent', 'Bold', 'Swift', 'Bright', 'Sharp', 'Cool', 'Smart'];
  nouns TEXT[] := ARRAY['Tiger', 'Eagle', 'Wolf', 'Shark', 'Hawk', 'Lion', 'Bear', 'Fox'];
  colors TEXT[] := ARRAY['Red', 'Blue', 'Green', 'Gold', 'Silver', 'Black', 'White', 'Purple'];
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate base username
  base_username := adjectives[1 + floor(random() * array_length(adjectives, 1))] || 
                   colors[1 + floor(random() * array_length(colors, 1))] || 
                   nouns[1 + floor(random() * array_length(nouns, 1))];
  
  final_username := base_username;
  
  -- Handle collisions with counter suffix
  WHILE EXISTS (SELECT 1 FROM public.user_accounts WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Create user_accounts table
CREATE TABLE IF NOT EXISTS public.user_accounts (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References to authentication
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User profile information
    email TEXT,
    wallet_address TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL DEFAULT generate_unique_username(),
    display_name TEXT,
    image_url TEXT,
    
    -- Points balances
    free_points DECIMAL(18,8) DEFAULT 0,
    reserved_points DECIMAL(18,8) DEFAULT 0,
    total_points DECIMAL(18,8) GENERATED ALWAYS AS (free_points + reserved_points) STORED,
    
    -- Timestamp tracking with consistent _at suffix
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_points_at TIMESTAMPTZ DEFAULT NOW(),
    updated_account_settings_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Daily login tracking
    last_login_at TIMESTAMPTZ,
    last_daily_bonus_awarded_at TIMESTAMPTZ
); 