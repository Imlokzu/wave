-- Check if user lokzu2 exists and their details
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
