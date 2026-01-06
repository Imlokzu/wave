-- Add AI bot user to the database
-- This allows the AI bot to send messages in DMs

-- First, check the table structure and insert AI bot user
INSERT INTO flux_users (id, username, nickname, password_hash, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'wavebot',
  '🤖 WaveBot',
  'no-password-ai-bot',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  username = 'wavebot',
  nickname = '🤖 WaveBot',
  password_hash = 'no-password-ai-bot';

-- Add comment
COMMENT ON TABLE flux_users IS 'AI bot user has fixed UUID: 00000000-0000-0000-0000-000000000001 with username wavebot';
