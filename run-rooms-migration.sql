-- Run this in your Supabase SQL Editor to add the rooms table with created_by column

-- Create rooms table for persistent chat rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  max_users INTEGER DEFAULT 50,
  is_locked BOOLEAN DEFAULT FALSE,
  moderators JSONB DEFAULT '[]',
  is_persistent BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES flux_users(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_persistent ON rooms(is_persistent);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);

-- Create room_participants table for tracking who's in rooms
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
GRANT ALL ON rooms TO authenticated;
GRANT ALL ON room_participants TO authenticated;

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Anyone can view rooms" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Room creators can update their rooms" ON rooms
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Room creators can delete their rooms" ON rooms
  FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for room_participants
CREATE POLICY "Anyone can view room participants" ON room_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON room_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms" ON room_participants
  FOR DELETE USING (user_id = auth.uid());
