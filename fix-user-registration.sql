-- Fix flux_users RLS policy to allow user registration
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can insert own record" ON flux_users;
DROP POLICY IF EXISTS "Users can view all profiles" ON flux_users;
DROP POLICY IF EXISTS "Users can update own profile" ON flux_users;
DROP POLICY IF EXISTS "Users can delete own profile" ON flux_users;

-- Allow anyone to register (INSERT)
CREATE POLICY "Allow public registration"
ON flux_users
FOR INSERT
WITH CHECK (true);

-- Allow users to view all profiles
CREATE POLICY "Anyone can view profiles"
ON flux_users
FOR SELECT
USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
ON flux_users
FOR UPDATE
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE id::text = auth.uid()::text
  END
);

-- Allow users to delete only their own profile
CREATE POLICY "Users can delete own profile"
ON flux_users
FOR DELETE
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE id::text = auth.uid()::text
  END
);
