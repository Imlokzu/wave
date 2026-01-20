-- Check if password_hash column exists in flux_users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'flux_users'
ORDER BY ordinal_position;

-- Check users without passwords
SELECT id, username, nickname, 
       CASE WHEN password_hash IS NULL THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END as password_status
FROM flux_users;
