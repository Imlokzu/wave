-- Make a user an admin
-- Replace 'lokzu' with your username

-- First, make sure the is_admin column exists
ALTER TABLE flux_users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Now update the user
UPDATE flux_users 
SET is_admin = TRUE 
WHERE username = 'lokzu';

-- Verify the change
SELECT id, username, nickname, is_admin, is_pro 
FROM flux_users 
WHERE username = 'lokzu';
