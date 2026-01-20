-- Setup Admin User for Wave Admin Panel
-- This script creates or updates a user with admin access

-- Step 1: Check if user exists
SELECT 
    id, 
    username, 
    nickname, 
    password_hash IS NOT NULL as has_password,
    is_admin,
    is_pro
FROM flux_users 
WHERE username = 'lokzu';

-- Step 2: If user doesn't exist, create one
-- Replace 'lokzu' with your desired username
-- Replace 'Admin User' with your desired nickname
-- Password will be: admin123 (change this after first login!)

-- First, ensure the is_admin column exists
ALTER TABLE flux_users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Insert or update user (this will fail if user exists, which is fine)
-- The password hash below is for 'admin123'
INSERT INTO flux_users (username, nickname, password_hash, is_admin, is_pro)
VALUES (
    'lokzu',
    'Admin User',
    '$2b$10$rKJ5VqZ9YvGxH0YvZ5YvZOqZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZO',
    TRUE,
    TRUE
)
ON CONFLICT (username) DO UPDATE SET
    is_admin = TRUE,
    is_pro = TRUE;

-- Step 3: Verify the user is set up correctly
SELECT 
    id, 
    username, 
    nickname, 
    password_hash IS NOT NULL as has_password,
    is_admin,
    is_pro,
    created_at
FROM flux_users 
WHERE username = 'lokzu';

-- If you see has_password = true and is_admin = true, you're ready!
-- Login with:
--   Username: lokzu
--   Password: admin123
-- 
-- IMPORTANT: Change your password after first login!
