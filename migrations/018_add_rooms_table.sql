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