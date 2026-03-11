-- Bio Profile Views Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bio_profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  views BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bio_profile_views_username ON bio_profile_views(username);

-- Enable RLS
ALTER TABLE bio_profile_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read views (public)
DROP POLICY IF EXISTS "Allow public read access" ON bio_profile_views;
CREATE POLICY "Allow public read access" ON bio_profile_views
  FOR SELECT
  USING (true);

-- Allow anyone to insert/update views (for incrementing)
DROP POLICY IF EXISTS "Allow public insert" ON bio_profile_views;
CREATE POLICY "Allow public insert" ON bio_profile_views
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update" ON bio_profile_views;
CREATE POLICY "Allow public update" ON bio_profile_views
  FOR UPDATE
  USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bio_profile_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bio_profile_views_updated_at_trigger ON bio_profile_views;
CREATE TRIGGER bio_profile_views_updated_at_trigger
  BEFORE UPDATE ON bio_profile_views
  FOR EACH ROW
  EXECUTE FUNCTION update_bio_profile_views_updated_at();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bio Profile Views Table Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ bio_profile_views table created';
  RAISE NOTICE '✓ RLS policies enabled';
  RAISE NOTICE '✓ Auto-update trigger installed';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to track profile views!';
  RAISE NOTICE '========================================';
END $$;
