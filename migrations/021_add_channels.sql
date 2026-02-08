-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES flux_users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at);
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);

-- Create channel_posts table
CREATE TABLE IF NOT EXISTS channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES flux_users(id) ON DELETE SET NULL,
  created_by_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_channel_posts_channel ON channel_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_posts_created_at ON channel_posts(created_at);

-- Create channel_reactions table
CREATE TABLE IF NOT EXISTS channel_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_channel_reactions_post ON channel_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_channel_reactions_user ON channel_reactions(user_id);
