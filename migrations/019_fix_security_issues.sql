-- Migration 019: Fix Security Issues
-- Enable RLS on tables and fix overly permissive policies

-- Enable RLS on tables that don't have it
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

-- Add proper RLS policies for playlists
CREATE POLICY "Users can view all playlists" ON playlists FOR SELECT USING (true);
CREATE POLICY "Users can create own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = user_id::uuid);

-- Add proper RLS policies for playlist_tracks
CREATE POLICY "Users can view all playlist tracks" ON playlist_tracks FOR SELECT USING (true);
CREATE POLICY "Users can add tracks to own playlists" ON playlist_tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id::uuid = auth.uid())
);
CREATE POLICY "Users can remove tracks from own playlists" ON playlist_tracks FOR DELETE USING (
  EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id::uuid = auth.uid())
);

-- Add proper RLS policies for music_tracks
CREATE POLICY "Users can view all music tracks" ON music_tracks FOR SELECT USING (true);
CREATE POLICY "Users can manage music tracks" ON music_tracks FOR ALL USING (true);

-- Add proper RLS policies for ai_conversations
CREATE POLICY "Users can view own AI conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can create own AI conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE POLICY "Users can update own AI conversations" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can delete own AI conversations" ON ai_conversations FOR DELETE USING (auth.uid() = user_id::uuid);

-- Add proper RLS policies for user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id::uuid);

-- Add proper RLS policies for telegram_channels
CREATE POLICY "Users can view all telegram channels" ON telegram_channels FOR SELECT USING (true);
CREATE POLICY "Admins can manage telegram channels" ON telegram_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Add proper RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can create own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can delete own subscriptions" ON subscriptions FOR DELETE USING (auth.uid() = user_id::uuid);

-- Add proper RLS policies for feed_posts
CREATE POLICY "Users can view all feed posts" ON feed_posts FOR SELECT USING (true);
CREATE POLICY "Admins can manage feed posts" ON feed_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Add proper RLS policies for message_reports
CREATE POLICY "Users can view own reports" ON message_reports FOR SELECT USING (auth.uid() = reporter_id::uuid);
CREATE POLICY "Users can create reports" ON message_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id::uuid);
CREATE POLICY "Admins can view all reports" ON message_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Add proper RLS policies for bug_reports
CREATE POLICY "Users can view own bug reports" ON bug_reports FOR SELECT USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can create bug reports" ON bug_reports FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE POLICY "Admins can view all bug reports" ON bug_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Add proper RLS policies for pro_requests
CREATE POLICY "Users can view own pro requests" ON pro_requests FOR SELECT USING (auth.uid() = user_id::uuid);
CREATE POLICY "Users can create pro requests" ON pro_requests FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
CREATE POLICY "Admins can view all pro requests" ON pro_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update pro requests" ON pro_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Add proper RLS policies for scam_reports
CREATE POLICY "Users can view own scam reports" ON scam_reports FOR SELECT USING (auth.uid() = reporter_id::uuid);
CREATE POLICY "Users can create scam reports" ON scam_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id::uuid);
CREATE POLICY "Admins can view all scam reports" ON scam_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Add proper RLS policies for user_bans
CREATE POLICY "Admins can view all bans" ON user_bans FOR SELECT USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage bans" ON user_bans FOR ALL USING (
  EXISTS (SELECT 1 FROM flux_users WHERE id::uuid = auth.uid() AND is_admin = true)
);

-- Fix overly permissive policies on existing tables
-- Drop and recreate flux_users policies
DROP POLICY IF EXISTS "Anyone can register" ON flux_users;
DROP POLICY IF EXISTS "Users can update own profile" ON flux_users;

CREATE POLICY "Anyone can register" ON flux_users FOR INSERT WITH CHECK (auth.uid() = id::uuid);
CREATE POLICY "Users can update own profile" ON flux_users FOR UPDATE USING (auth.uid() = id::uuid) WITH CHECK (auth.uid() = id::uuid);

-- Fix direct_messages policies
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON direct_messages;

CREATE POLICY "Users can send messages" ON direct_messages FOR INSERT WITH CHECK (auth.uid() = from_user_id::uuid);
CREATE POLICY "Users can update own messages" ON direct_messages FOR UPDATE USING (auth.uid() = from_user_id::uuid) WITH CHECK (auth.uid() = from_user_id::uuid);

-- Fix function search_path issues by adding SECURITY DEFINER and search_path
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

CREATE OR REPLACE FUNCTION is_pro_user(user_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM flux_users WHERE id = user_id_param AND is_pro = true
  );
END;
$$;

-- Add search_path to other functions (simplified - you may need to adjust based on actual function definitions)
-- Note: You'll need to recreate each function with SET search_path = public added
