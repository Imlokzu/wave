-- Wave Bio Profiles - Supabase Migration
-- Run this in your Supabase SQL Editor to add bio profile support
-- This extends the existing user_profiles table

-- =====================================================
-- BIO PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bio_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  
  -- Basic Info
  username TEXT,
  display_name TEXT,
  bio TEXT,
  
  -- Media URLs (stored in Supabase Storage)
  avatar_url TEXT,
  background_video_url TEXT,
  background_music_url TEXT,
  custom_cursor_url TEXT,
  
  -- Configuration
  theme VARCHAR(50) DEFAULT 'default', -- default, dark, red, green, orange, pink, cyan
  custom_cursor_enabled BOOLEAN DEFAULT true,
  auto_play_music BOOLEAN DEFAULT false,
  
  -- Badges (JSON array)
  badges JSONB DEFAULT '[]'::jsonb,
  
  -- Social Links (JSON array)
  social_links JSONB DEFAULT '[]'::jsonb,
  
  -- Skills (JSON array)
  skills JSONB DEFAULT '[]'::jsonb,
  
  -- Stats
  views BIGINT DEFAULT 0,
  visits BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bio_profiles_user_id ON bio_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bio_profiles_username ON bio_profiles(username);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- Create storage buckets for bio profile assets
-- Run this in Supabase Dashboard > Storage or via SQL

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('bio-avatars', 'bio-avatars', true),
  ('bio-backgrounds', 'bio-backgrounds', true),
  ('bio-music', 'bio-music', true),
  ('bio-cursors', 'bio-cursors', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE bio_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON bio_profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON bio_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON bio_profiles;
DROP POLICY IF EXISTS "Allow users to delete own profile" ON bio_profiles;

-- Allow anyone to read bio profiles (public profiles)
CREATE POLICY "Allow public read access" ON bio_profiles
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow users to insert own profile" ON bio_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow users to update own profile" ON bio_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own profile
CREATE POLICY "Allow users to delete own profile" ON bio_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================
-- Allow public read access to bio profile assets
DROP POLICY IF EXISTS "Allow public read on bio-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on bio-backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on bio-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on bio-cursors" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated upload on bio-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload on bio-backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload on bio-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload on bio-cursors" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated delete on bio-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on bio-backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on bio-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on bio-cursors" ON storage.objects;

-- Avatar bucket policies
CREATE POLICY "Allow public read on bio-avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bio-avatars');

CREATE POLICY "Allow authenticated upload on bio-avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bio-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated delete on bio-avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bio-avatars' AND
    auth.role() = 'authenticated'
  );

-- Background bucket policies
CREATE POLICY "Allow public read on bio-backgrounds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bio-backgrounds');

CREATE POLICY "Allow authenticated upload on bio-backgrounds"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bio-backgrounds' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated delete on bio-backgrounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bio-backgrounds' AND
    auth.role() = 'authenticated'
  );

-- Music bucket policies
CREATE POLICY "Allow public read on bio-music"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bio-music');

CREATE POLICY "Allow authenticated upload on bio-music"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bio-music' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated delete on bio-music"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bio-music' AND
    auth.role() = 'authenticated'
  );

-- Cursor bucket policies
CREATE POLICY "Allow public read on bio-cursors"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bio-cursors');

CREATE POLICY "Allow authenticated upload on bio-cursors"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bio-cursors' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated delete on bio-cursors"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bio-cursors' AND
    auth.role() = 'authenticated'
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_bio_profile_views(profile_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE bio_profiles
  SET views = views + 1,
      updated_at = NOW()
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment visit count
CREATE OR REPLACE FUNCTION increment_bio_profile_visits(profile_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE bio_profiles
  SET visits = visits + 1,
      updated_at = NOW()
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get bio profile by username
CREATE OR REPLACE FUNCTION get_bio_profile_by_username(p_username TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  background_video_url TEXT,
  background_music_url TEXT,
  theme VARCHAR,
  badges JSONB,
  social_links JSONB,
  skills JSONB,
  views BIGINT,
  visits BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.user_id,
    bp.username,
    bp.display_name,
    bp.bio,
    bp.avatar_url,
    bp.background_video_url,
    bp.background_music_url,
    bp.theme::VARCHAR,
    bp.badges,
    bp.social_links,
    bp.skills,
    bp.views,
    bp.visits
  FROM bio_profiles bp
  WHERE bp.username = p_username;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bio_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bio_profiles_updated_at_trigger ON bio_profiles;

CREATE TRIGGER bio_profiles_updated_at_trigger
  BEFORE UPDATE ON bio_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_bio_profile_updated_at();

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM bio_profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Wave Bio Profiles Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ bio_profiles table created';
  RAISE NOTICE '✓ Storage buckets created';
  RAISE NOTICE '✓ RLS policies enabled';
  RAISE NOTICE '✓ Storage policies configured';
  RAISE NOTICE '✓ Helper functions installed';
  RAISE NOTICE '✓ Current profiles: %', profile_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Upload assets via the profile editor';
  RAISE NOTICE '2. Access editor at: /bio-profile/editor';
  RAISE NOTICE '3. View profiles at: /bio/{username}';
  RAISE NOTICE '========================================';
END $$;
