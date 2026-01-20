-- Wave Platform Database Migration
-- This migration adds all tables needed for Wave features

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLANS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS clans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL CHECK (length(tag) <= 6 AND tag ~ '^[A-Z0-9]+$'),
  description TEXT,
  owner_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_members (
  clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS clan_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clans
CREATE INDEX IF NOT EXISTS idx_clans_owner ON clans(owner_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_messages_clan ON clan_messages(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_messages_created ON clan_messages(created_at DESC);

-- ============================================
-- MUSIC SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration INTEGER NOT NULL, -- in seconds
  file_url TEXT NOT NULL,
  file_size BIGINT, -- in bytes
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  track_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, track_id)
);

-- Indexes for music
CREATE INDEX IF NOT EXISTS idx_music_tracks_user ON music_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_public ON music_tracks(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);

-- ============================================
-- STATUS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS user_status (
  user_id UUID PRIMARY KEY REFERENCES flux_users(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL CHECK (status_type IN ('online', 'idle', 'dnd', 'offline')) DEFAULT 'offline',
  custom_status TEXT,
  activity_type TEXT CHECK (activity_type IN ('playing', 'listening', 'watching')),
  activity_name TEXT,
  auto_status BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status
CREATE INDEX IF NOT EXISTS idx_user_status_type ON user_status(status_type);
CREATE INDEX IF NOT EXISTS idx_user_status_last_active ON user_status(last_active DESC);

-- ============================================
-- PROFILES SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES flux_users(id) ON DELETE CASCADE,
  bio TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  badges JSONB DEFAULT '[]'::jsonb,
  theme_settings JSONB DEFAULT '{"primaryColor": "#3b82f6", "accentColor": "#06b6d4"}'::jsonb,
  profile_effects JSONB DEFAULT '[]'::jsonb,
  banner_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALL HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('voice', 'video')),
  participants JSONB NOT NULL, -- Array of user IDs
  initiator_id UUID REFERENCES flux_users(id),
  channel_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER, -- in seconds
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'rejected', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for call history
CREATE INDEX IF NOT EXISTS idx_call_history_initiator ON call_history(initiator_id);
CREATE INDEX IF NOT EXISTS idx_call_history_start_time ON call_history(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_participants ON call_history USING GIN (participants);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES flux_users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro')) DEFAULT 'free',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date) WHERE end_date IS NOT NULL;

-- ============================================
-- VOICE MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  room_id UUID, -- Can be null for DMs
  dm_recipient_id UUID REFERENCES flux_users(id),
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  waveform JSONB, -- Array of amplitude values for visualization
  transcription TEXT,
  file_size BIGINT, -- in bytes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voice messages
CREATE INDEX IF NOT EXISTS idx_voice_messages_user ON voice_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_room ON voice_messages(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_messages_dm ON voice_messages(dm_recipient_id) WHERE dm_recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_messages_created ON voice_messages(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get user's clan
CREATE OR REPLACE FUNCTION get_user_clan(p_user_id UUID)
RETURNS TABLE (
  clan_id UUID,
  clan_name TEXT,
  clan_tag TEXT,
  clan_description TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.tag,
    c.description,
    cm.role,
    cm.joined_at
  FROM clans c
  JOIN clan_members cm ON c.id = cm.clan_id
  WHERE cm.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search clans
CREATE OR REPLACE FUNCTION search_clans(p_query TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  tag TEXT,
  description TEXT,
  member_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.tag,
    c.description,
    COUNT(cm.user_id) as member_count,
    c.created_at
  FROM clans c
  LEFT JOIN clan_members cm ON c.id = cm.clan_id
  WHERE 
    c.name ILIKE '%' || p_query || '%' OR
    c.tag ILIKE '%' || p_query || '%' OR
    c.description ILIKE '%' || p_query || '%'
  GROUP BY c.id, c.name, c.tag, c.description, c.created_at
  ORDER BY member_count DESC, c.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's playlists
CREATE OR REPLACE FUNCTION get_user_playlists(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_public BOOLEAN,
  track_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.is_public,
    p.track_count,
    p.created_at
  FROM playlists p
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is Pro
CREATE OR REPLACE FUNCTION is_pro_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_pro BOOLEAN;
BEGIN
  SELECT 
    CASE 
      WHEN tier = 'pro' AND (end_date IS NULL OR end_date > NOW()) THEN true
      ELSE false
    END INTO v_is_pro
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_is_pro, false);
END;
$$ LANGUAGE plpgsql;

-- Function to update playlist track count
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET track_count = track_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET track_count = GREATEST(0, track_count - 1),
        updated_at = NOW()
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for playlist track count
DROP TRIGGER IF EXISTS trigger_update_playlist_track_count ON playlist_tracks;
CREATE TRIGGER trigger_update_playlist_track_count
AFTER INSERT OR DELETE ON playlist_tracks
FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- Clans policies
CREATE POLICY "Clans are viewable by everyone" ON clans FOR SELECT USING (true);
CREATE POLICY "Users can create clans" ON clans FOR INSERT WITH CHECK (true);
CREATE POLICY "Clan owners can update their clans" ON clans FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Clan owners can delete their clans" ON clans FOR DELETE USING (owner_id = auth.uid());

-- Clan members policies
CREATE POLICY "Clan members are viewable by everyone" ON clan_members FOR SELECT USING (true);
CREATE POLICY "Users can join clans" ON clan_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can leave clans" ON clan_members FOR DELETE USING (user_id = auth.uid());

-- Clan messages policies
CREATE POLICY "Clan messages viewable by clan members" ON clan_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM clan_members WHERE clan_id = clan_messages.clan_id AND user_id = auth.uid()));
CREATE POLICY "Clan members can send messages" ON clan_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM clan_members WHERE clan_id = clan_messages.clan_id AND user_id = auth.uid()));

-- Music tracks policies
CREATE POLICY "Public tracks viewable by everyone" ON music_tracks FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Users can upload tracks" ON music_tracks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their tracks" ON music_tracks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their tracks" ON music_tracks FOR DELETE USING (user_id = auth.uid());

-- Playlists policies
CREATE POLICY "Public playlists viewable by everyone" ON playlists FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Users can create playlists" ON playlists FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their playlists" ON playlists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their playlists" ON playlists FOR DELETE USING (user_id = auth.uid());

-- Playlist tracks policies
CREATE POLICY "Playlist tracks viewable by playlist viewers" ON playlist_tracks FOR SELECT 
  USING (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_tracks.playlist_id AND (is_public = true OR user_id = auth.uid())));
CREATE POLICY "Playlist owners can manage tracks" ON playlist_tracks FOR ALL 
  USING (EXISTS (SELECT 1 FROM playlists WHERE id = playlist_tracks.playlist_id AND user_id = auth.uid()));

-- User status policies
CREATE POLICY "User status viewable by everyone" ON user_status FOR SELECT USING (true);
CREATE POLICY "Users can update their status" ON user_status FOR ALL USING (user_id = auth.uid());

-- User profiles policies
CREATE POLICY "User profiles viewable by everyone" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their profile" ON user_profiles FOR ALL USING (user_id = auth.uid());

-- Call history policies
CREATE POLICY "Users can view their call history" ON call_history FOR SELECT 
  USING (initiator_id = auth.uid() OR participants ? auth.uid()::text);
CREATE POLICY "Users can create call records" ON call_history FOR INSERT WITH CHECK (initiator_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view their subscription" ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage their subscription" ON subscriptions FOR ALL USING (user_id = auth.uid());

-- Voice messages policies
CREATE POLICY "Users can view voice messages in their conversations" ON voice_messages FOR SELECT 
  USING (user_id = auth.uid() OR dm_recipient_id = auth.uid());
CREATE POLICY "Users can create voice messages" ON voice_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their voice messages" ON voice_messages FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default subscriptions for existing users
INSERT INTO subscriptions (user_id, tier, start_date)
SELECT id, 'free', NOW()
FROM flux_users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Create default status for existing users
INSERT INTO user_status (user_id, status_type)
SELECT id, 'offline'
FROM flux_users
WHERE id NOT IN (SELECT user_id FROM user_status)
ON CONFLICT (user_id) DO NOTHING;

-- Create default profiles for existing users
INSERT INTO user_profiles (user_id)
SELECT id
FROM flux_users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE clans IS 'Joinable groups with unique tags';
COMMENT ON TABLE clan_members IS 'Members of clans with roles';
COMMENT ON TABLE clan_messages IS 'Messages sent in clan chats';
COMMENT ON TABLE music_tracks IS 'User uploaded music tracks';
COMMENT ON TABLE playlists IS 'User created playlists';
COMMENT ON TABLE playlist_tracks IS 'Tracks in playlists';
COMMENT ON TABLE user_status IS 'User presence and activity status';
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE call_history IS 'History of voice and video calls';
COMMENT ON TABLE subscriptions IS 'User subscription tiers (free/pro)';
COMMENT ON TABLE voice_messages IS 'Voice messages sent in chats';

-- Migration complete!
SELECT 'Wave database migration completed successfully!' as message;
