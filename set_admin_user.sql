-- Set a specific user as admin
-- Replace 'your_email@example.com' with the actual email of the user you want to make admin

-- Check if the user exists
DO $$
DECLARE
  user_exists BOOLEAN;
  user_email TEXT := 'your_email@example.com'; -- Replace with actual email
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_accounts 
    WHERE email = user_email
  ) INTO user_exists;
  
  IF user_exists THEN
    -- Set the user as admin
    PERFORM set_user_as_admin(user_email, TRUE);
    RAISE NOTICE 'User % has been set as admin', user_email;
  ELSE
    RAISE NOTICE 'User % not found', user_email;
  END IF;
END $$;

-- Verify admin users
SELECT id, email, is_admin FROM public.user_accounts WHERE is_admin = TRUE; 