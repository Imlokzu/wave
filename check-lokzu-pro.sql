-- Check if lokzu is Pro
SELECT 
  u.id,
  u.username,
  u.nickname,
  u.is_pro,
  u.created_at
FROM flux_users u
WHERE u.username = 'lokzu';
