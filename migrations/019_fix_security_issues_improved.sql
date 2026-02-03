-- Migration 019: Fix Security Issues (IMPROVED VERSION)
-- Enable RLS on tables and fix overly permissive policies
-- 
-- ROLLBACK: See end of file for rollback instructions

-- ============================================
-- SECTION 1: Enable RLS on Tables
-- ============================================

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scam_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 2: Create Helper Functions
-- ============================================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM flux_users 
    WHERE id = auth.uid()::text AND role = 'admin'
  );
$$;

-- Helper function to check if user is pro
CREATE OR REPLACE FUNCTION is_pro_user(user_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM flux_users 
    WHERE id = user_id_param AND is_pro = true
  );
$$;

-- Cleanup expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$;

-- ============================================
-- SECTION 3: Add Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_uploaded_by ON music_tracks(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter_id ON message_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_requests_user_id ON pro_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_scam_reports_reporter_id ON scam_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_flux_users_role ON flux_users(role) WHERE role = 'admin';

-- ============================================
-- SECTION 4: RLS Policies - Playlists
-- ============================================

DROP POLICY IF EXISTS "Users can view all playlists" ON playlists;
DROP POLICY IF EXISTS "Users can create own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;

CREATE POLICY "Users can view all playlists" ON playlists 
  FOR SELECT USING (true);
  
CREATE POLICY "Users can create own playlists" ON playlists 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY "Users can update own playlists" ON playlists 
  FOR UPDATE USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can delete own playlists" ON playlists 
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- SECTION 5: RLS Policies - Playlist Tracks
-- ============================================

DROP POLICY IF EXISTS "Users can view all playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can add tracks to own playlists" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can remove tracks from own playlists" ON playlist_tracks;

CREATE POLICY "Users can view all playlist tracks" ON playlist_tracks 
  FOR SELECT USING (true);
  
CREATE POLICY "Users can add tracks to own playlists" ON playlist_tracks 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()::text)
  );
  
CREATE POLICY "Users can remove tracks from own playlists" ON playlist_tracks 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid()::text)
  );

-- ============================================
-- SECTION 6: RLS Policies - Music Tracks
-- ============================================

DROP POLICY IF EXISTS "Users can view all music tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can upload own music tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can update own music tracks" ON music_tracks;
DROP POLICY IF EXISTS "Users can delete own music tracks" ON music_tracks;

CREATE POLICY "Users can view all music tracks" ON music_tracks 
  FOR SELECT USING (true);
  
CREATE POLICY "Users can upload own music tracks" ON music_tracks 
  FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
  
CREATE POLICY "Users can update own music tracks" ON music_tracks 
  FOR UPDATE USING (auth.uid()::text = uploaded_by);
  
CREATE POLICY "Users can delete own music tracks" ON music_tracks 
  FOR DELETE USING (auth.uid()::text = uploaded_by);

-- ============================================
-- SECTION 7: RLS Policies - AI Conversations
-- ============================================

DROP POLICY IF EXISTS "Users can view own AI conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can create own AI conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update own AI conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete own AI conversations" ON ai_conversations;

CREATE POLICY "Users can view own AI conversations" ON ai_conversations 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can create own AI conversations" ON ai_conversations 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY "Users can update own AI conversations" ON ai_conversations 
  FOR UPDATE USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can delete own AI conversations" ON ai_conversations 
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- SECTION 8: RLS Policies - User Profiles
-- ============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view all profiles" ON user_profiles 
  FOR SELECT USING (true);
  
CREATE POLICY "Users can create own profile" ON user_profiles 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid()::text = user_id);

-- ============================================
-- SECTION 9: RLS Policies - Telegram Channels
-- ============================================

DROP POLICY IF EXISTS "Users can view all telegram channels" ON telegram_channels;
DROP POLICY IF EXISTS "Admins can manage telegram channels" ON telegram_channels;

CREATE POLICY "Users can view all telegram channels" ON telegram_channels 
  FOR SELECT USING (true);
  
CREATE POLICY "Admins can manage telegram channels" ON telegram_channels 
  FOR ALL USING (is_admin());

-- ============================================
-- SECTION 10: RLS Policies - Subscriptions
-- ============================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions" ON subscriptions 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can create own subscriptions" ON subscriptions 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY "Users can update own subscriptions" ON subscriptions 
  FOR UPDATE USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can delete own subscriptions" ON subscriptions 
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- SECTION 11: RLS Policies - Feed Posts
-- ============================================

DROP POLICY IF EXISTS "Users can view all feed posts" ON feed_posts;
DROP POLICY IF EXISTS "Admins can manage feed posts" ON feed_posts;

CREATE POLICY "Users can view all feed posts" ON feed_posts 
  FOR SELECT USING (true);
  
CREATE POLICY "Admins can manage feed posts" ON feed_posts 
  FOR ALL USING (is_admin());

-- ============================================
-- SECTION 12: RLS Policies - Message Reports
-- ============================================

DROP POLICY IF EXISTS "Users can view own message reports" ON message_reports;
DROP POLICY IF EXISTS "Users can create message reports" ON message_reports;
DROP POLICY IF EXISTS "Admins can view all message reports" ON message_reports;

CREATE POLICY "Users can view own message reports" ON message_reports 
  FOR SELECT USING (auth.uid()::text = reporter_id);
  
CREATE POLICY "Users can create message reports" ON message_reports 
  FOR INSERT WITH CHECK (auth.uid()::text = reporter_id);
  
CREATE POLICY "Admins can view all message reports" ON message_reports 
  FOR SELECT USING (is_admin());

-- ============================================
-- SECTION 13: RLS Policies - Bug Reports
-- ============================================

DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can create bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can view all bug reports" ON bug_reports;

CREATE POLICY "Users can view own bug reports" ON bug_reports 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can create bug reports" ON bug_reports 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY "Admins can view all bug reports" ON bug_reports 
  FOR SELECT USING (is_admin());

-- ============================================
-- SECTION 14: RLS Policies - Pro Requests
-- ============================================

DROP POLICY IF EXISTS "Users can view own pro requests" ON pro_requests;
DROP POLICY IF EXISTS "Users can create pro requests" ON pro_requests;
DROP POLICY IF EXISTS "Admins can view all pro requests" ON pro_requests;
DROP POLICY IF EXISTS "Admins can update pro requests" ON pro_requests;

CREATE POLICY "Users can view own pro requests" ON pro_requests 
  FOR SELECT USING (auth.uid()::text = user_id);
  
CREATE POLICY "Users can create pro requests" ON pro_requests 
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  
CREATE POLICY "Admins can view all pro requests" ON pro_requests 
  FOR SELECT USING (is_admin());
  
CREATE POLICY "Admins can update pro requests" ON pro_requests 
  FOR UPDATE USING (is_admin());

-- ============================================
-- SECTION 15: RLS Policies - Scam Reports
-- ============================================

DROP POLICY IF EXISTS "Users can view own scam reports" ON scam_reports;
DROP POLICY IF EXISTS "Users can create scam reports" ON scam_reports;
DROP POLICY IF EXISTS "Admins can view all scam reports" ON scam_reports;

CREATE POLICY "Users can view own scam reports" ON scam_reports 
  FOR SELECT USING (auth.uid()::text = reporter_id);
  
CREATE POLICY "Users can create scam reports" ON scam_reports 
  FOR INSERT WITH CHECK (auth.uid()::text = reporter_id);
  
CREATE POLICY "Admins can view all scam reports" ON scam_reports 
  FOR SELECT USING (is_admin());

-- ============================================
-- SECTION 16: RLS Policies - User Bans
-- ============================================

DROP POLICY IF EXISTS "Admins can view all bans" ON user_bans;
DROP POLICY IF EXISTS "Admins can manage bans" ON user_bans;

CREATE POLICY "Admins can view all bans" ON user_bans 
  FOR SELECT USING (is_admin());
  
CREATE POLICY "Admins can manage bans" ON user_bans 
  FOR ALL USING (is_admin());

-- ============================================
-- SECTION 17: Fix Existing Table Policies
-- ============================================

-- Fix flux_users policies
DROP POLICY IF EXISTS "Anyone can register" ON flux_users;
DROP POLICY IF EXISTS "Users can update own profile" ON flux_users;

CREATE POLICY "Anyone can register" ON flux_users 
  FOR INSERT WITH CHECK (auth.uid()::text = id);
  
CREATE POLICY "Users can update own profile" ON flux_users 
  FOR UPDATE USING (auth.uid()::text = id) 
  WITH CHECK (auth.uid()::text = id);

-- Fix direct_messages policies
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON direct_messages;

CREATE POLICY "Users can send messages" ON direct_messages 
  FOR INSERT WITH CHECK (auth.uid()::text = from_user_id);
  
CREATE POLICY "Users can update own messages" ON direct_messages 
  FOR UPDATE USING (auth.uid()::text = from_user_id) 
  WITH CHECK (auth.uid()::text = from_user_id);
  
CREATE POLICY "Users can delete own messages" ON direct_messages 
  FOR DELETE USING (auth.uid()::text = from_user_id);

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

/*
To rollback this migration:

-- Disable RLS
ALTER TABLE playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE pro_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE scam_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans DISABLE ROW LEVEL SECURITY;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_pro_user(TEXT);
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- Drop indexes
DROP INDEX IF EXISTS idx_playlists_user_id;
DROP INDEX IF EXISTS idx_playlist_tracks_playlist_id;
DROP INDEX IF EXISTS idx_music_tracks_uploaded_by;
DROP INDEX IF EXISTS idx_ai_conversations_user_id;
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_message_reports_reporter_id;
DROP INDEX IF EXISTS idx_bug_reports_user_id;
DROP INDEX IF EXISTS idx_pro_requests_user_id;
DROP INDEX IF EXISTS idx_scam_reports_reporter_id;
DROP INDEX IF EXISTS idx_flux_users_role;
*/
