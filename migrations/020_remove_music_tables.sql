-- Migration 020: Remove Music Tables
-- Description: Remove all music-related tables and functions to simplify Wave Messenger
-- Date: February 6, 2026
-- Reason: Focusing app on core messaging features only

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_playlist_track_count ON playlist_tracks;

-- Drop functions
DROP FUNCTION IF EXISTS update_playlist_track_count();
DROP FUNCTION IF EXISTS get_user_playlists(UUID);

-- Drop RLS policies (from migration 019)
DROP POLICY IF EXISTS "Users can view all playlists" ON playlists;
DROP POLICY IF EXISTS "Users can create own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can view all playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can add tracks to own playlists" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can remove tracks from own playlists" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can view all music tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can manage music tracks" ON music_tracks;

-- Drop tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS playlist_tracks CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS music_tracks CASCADE;

-- Note: Music files uploaded by users should be manually cleaned from storage
-- Migration complete - music feature fully removed
