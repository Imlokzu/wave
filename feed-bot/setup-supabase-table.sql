-- Run this in your Supabase SQL Editor to create the telegram_messages table

-- Create telegram_messages table
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id BIGINT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  date TIMESTAMP NOT NULL,
  message TEXT,
  media_type TEXT,
  media_path TEXT,
  views INTEGER,
  forwards INTEGER,
  sender_id BIGINT,
  username TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, channel_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_messages_channel ON telegram_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_date ON telegram_messages(date DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages(created_at DESC);

-- Create storage bucket for telegram media (if not exists)
-- Note: You need to create this manually in Supabase Storage UI
-- Bucket name: telegram_media
-- Public: Yes (so media URLs are accessible)

-- Grant permissions
GRANT ALL ON telegram_messages TO authenticated;
GRANT ALL ON telegram_messages TO anon;

-- Enable RLS (Row Level Security)
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow anyone to read, only authenticated to write
CREATE POLICY "Anyone can view telegram messages" ON telegram_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert telegram messages" ON telegram_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update telegram messages" ON telegram_messages
  FOR UPDATE USING (true);
