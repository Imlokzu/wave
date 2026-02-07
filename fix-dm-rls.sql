-- Fix Direct Messages RLS Policy
-- The backend uses custom authentication, not Supabase Auth
-- So we need to disable RLS and rely on backend API authentication

-- Disable RLS on direct_messages table
ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can view own messages" ON direct_messages;
DROP POLICY IF EXISTS "Allow all on direct_messages" ON direct_messages;

-- Verify RLS is disabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'direct_messages' 
    AND rowsecurity = false
  ) THEN
    RAISE NOTICE '✓ RLS disabled on direct_messages table';
  ELSE
    RAISE WARNING '⚠ RLS might still be enabled';
  END IF;
END $$;
