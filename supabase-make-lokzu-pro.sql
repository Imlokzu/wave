-- Make user 'lokzu' a Pro user
-- Run this in Supabase SQL Editor

-- Update user to Pro status
UPDATE flux_users
SET is_pro = true
WHERE username = 'lokzu';

-- Update subscription to Pro
UPDATE subscriptions
SET 
  tier = 'pro',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM flux_users WHERE username = 'lokzu');

-- Verify the changes
SELECT 
  u.id,
  u.username,
  u.nickname,
  u.is_pro,
  s.tier,
  s.start_date,
  s.end_date
FROM flux_users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.username = 'lokzu';
