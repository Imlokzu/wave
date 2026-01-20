-- Fixed telegram feed tables migration for flux_users
-- Run this in your Supabase SQL editor

-- Create telegram_channels table
CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  channel_url TEXT NOT NULL,
  channel_name TEXT,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_url)
);

-- Create feed_posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES telegram_channels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  post_url TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, post_url)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_telegram_channels_user_id ON telegram_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_channels_active ON telegram_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_feed_posts_channel_id ON feed_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_published_at ON feed_posts(published_at DESC);

-- Disable RLS (not using Supabase Auth)
ALTER TABLE telegram_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own channels" ON telegram_channels;
DROP POLICY IF EXISTS "Users can insert their own channels" ON telegram_channels;
DROP POLICY IF EXISTS "Users can update their own channels" ON telegram_channels;
DROP POLICY IF EXISTS "Users can delete their own channels" ON telegram_channels;
DROP POLICY IF EXISTS "Users can view posts from their channels" ON feed_posts;

-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_telegram_channels_updated_at ON telegram_channels;
CREATE TRIGGER update_telegram_channels_updated_at
  BEFORE UPDATE ON telegram_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'telegram_channels table created' as status;
SELECT 'feed_posts table created' as status;
