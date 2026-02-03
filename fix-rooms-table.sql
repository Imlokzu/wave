-- Run this in your Supabase SQL Editor to fix the rooms table
-- This will add all missing columns needed for persistent rooms

-- Add missing columns one by one
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES flux_users(id) ON DELETE SET NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_rooms_persistent ON rooms(is_persistent);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);

-- Create room_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  role VARCHAR(20) DEFAULT 'member',
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

-- Grant permissions
GRANT ALL ON room_participants TO authenticated;

-- Enable RLS on room_participants if not already enabled
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view room participants" ON room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_participants;

-- RLS Policies for room_participants
CREATE POLICY "Users can view room participants" ON room_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON room_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms" ON room_participants
  FOR DELETE USING (user_id = auth.uid());

