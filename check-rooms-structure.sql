-- Run this first to see what columns your rooms table currently has
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms'
ORDER BY ordinal_position;
