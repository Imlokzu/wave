-- Create telegram_channels table
CREATE TABLE IF NOT EXISTS telegram_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_url TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_url)
);

-- Create feed_posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX IF NOT EXISTS idx_feed_posts_channel_id ON feed_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_published_at ON feed_posts(published_at DESC);

-- Enable Row Level Security
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for telegram_channels
CREATE POLICY "Users can view their own channels"
  ON telegram_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channels"
  ON telegram_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels"
  ON telegram_channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels"
  ON telegram_channels FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for feed_posts
CREATE POLICY "Users can view posts from their channels"
  ON feed_posts FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM telegram_channels WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_telegram_channels_updated_at
  BEFORE UPDATE ON telegram_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
