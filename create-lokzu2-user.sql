-- Create or update user lokzu2 with password ml120998
-- Run this in Supabase SQL Editor

-- Create or update the user
INSERT INTO flux_users (username, nickname, password_hash, is_admin, is_pro)
VALUES ('lokzu2', 'itzlokzu', '$2b$10$Ib9lz.K4BXh7SpV8zk5Oneg/S1WcQNXI9OFr/ijmFCrL8iS7eq9Fi', true, true)
ON CONFLICT (username) 
DO UPDATE SET 
  nickname = 'itzlokzu',
  password_hash = '$2b$10$Ib9lz.K4BXh7SpV8zk5Oneg/S1WcQNXI9OFr/ijmFCrL8iS7eq9Fi',
  is_admin = true,
  is_pro = true;

-- Verify the user was created/updated
SELECT 
  id, 
  username, 
  nickname, 
  is_admin, 
  is_pro, 
  password_hash IS NOT NULL as has_password,
  LENGTH(password_hash) as password_hash_length,
  created_at
FROM flux_users 
WHERE username = 'lokzu2';
