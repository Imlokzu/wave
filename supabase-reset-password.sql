-- Reset user password
-- This sets the password to 'password123' for the specified user
-- Change 'lokzu' to your username

-- The password hash below is for 'password123'
-- Generated with: bcrypt.hash('password123', 10)

UPDATE flux_users 
SET password_hash = '$2b$10$YourHashWillBeHere'
WHERE username = 'lokzu';

-- Verify the update
SELECT username, nickname, password_hash IS NOT NULL as has_password, is_admin, is_pro
FROM flux_users 
WHERE username = 'lokzu';

-- IMPORTANT: After running this, login with:
--   Username: lokzu
--   Password: password123
-- Then change your password in settings!
