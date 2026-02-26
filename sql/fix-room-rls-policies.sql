-- Fix Room Creation RLS Policies
-- Run this in Supabase SQL Editor

-- Enable RLS on rooms table
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all on rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to create rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to view rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON rooms;

-- Allow authenticated users to create rooms
CREATE POLICY "Allow authenticated users to create rooms" ON rooms
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to view rooms
CREATE POLICY "Allow authenticated users to view rooms" ON rooms
  FOR SELECT
  USING (true);

-- Allow room creators to update their rooms
CREATE POLICY "Allow room creators to update rooms" ON rooms
  FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() IN (
    SELECT user_id FROM room_participants WHERE room_id = id AND role = 'moderator'
  ));

-- Allow room creators to delete their rooms
CREATE POLICY "Allow room creators to delete rooms" ON rooms
  FOR DELETE
  USING (auth.uid() = creator_id);

-- Allow authenticated users to manage room participants
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on room_participants" ON room_participants;

-- Allow authenticated users to join rooms
CREATE POLICY "Allow authenticated users to join rooms" ON room_participants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to view room participants
CREATE POLICY "Allow authenticated users to view room participants" ON room_participants
  FOR SELECT
  USING (true);

-- Allow authenticated users to leave rooms
CREATE POLICY "Allow authenticated users to leave rooms" ON room_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('rooms', 'room_participants')
ORDER BY tablename, policyname;
