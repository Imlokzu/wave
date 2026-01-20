-- Fix RLS for music tables
-- Run this in Supabase SQL Editor to disable RLS

-- Disable RLS on music tables (we use custom auth, not Supabase Auth)
ALTER TABLE music_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can insert their own tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can update their own tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can delete their own tracks" ON music_tracks;

DROP POLICY IF EXISTS "Users can view their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can insert their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update their own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete their own playlists" ON playlists;

DROP POLICY IF EXISTS "Users can view playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can manage their playlist tracks" ON playlist_tracks;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('music_tracks', 'playlists', 'playlist_tracks');

-- Should show rowsecurity = false for all three tables
