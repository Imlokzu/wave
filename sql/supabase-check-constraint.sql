-- Check current username constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'flux_users'::regclass
AND conname = 'username_format';

-- This will show you what constraint is currently active
-- If it shows: CHECK ((username ~ '^[a-z0-9_]+$'::text))
-- Then you need to run the fix

-- If it shows: CHECK ((username ~ '^[a-zA-Z0-9_]+$'::text))
-- Then the fix is already applied
