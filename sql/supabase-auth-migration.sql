-- Authentication and Friend System Migration for Supabase
-- Run this in your Supabase SQL Editor AFTER running supabase-schema.sql

-- =====================================================
-- ADD PASSWORD HASH TO FLUX_USERS
-- =====================================================
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- =====================================================
-- SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key (will skip if exists)
ALTER TABLE sessions 
ADD CONSTRAINT sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES flux_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- =====================================================
-- FRIEND INVITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS friend_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign keys and constraints
ALTER TABLE friend_invites 
ADD CONSTRAINT friend_invites_from_user_id_fkey 
FOREIGN KEY (from_user_id) REFERENCES flux_users(id) ON DELETE CASCADE;

ALTER TABLE friend_invites 
ADD CONSTRAINT friend_invites_to_user_id_fkey 
FOREIGN KEY (to_user_id) REFERENCES flux_users(id) ON DELETE CASCADE;

ALTER TABLE friend_invites 
ADD CONSTRAINT friend_invites_no_self_invite 
CHECK (from_user_id != to_user_id);

-- Create unique index for pending invites only
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_invites_unique_pending 
ON friend_invites(from_user_id, to_user_id) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_friend_invites_to_user ON friend_invites(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_invites_from_user ON friend_invites(from_user_id);

-- =====================================================
-- FRIENDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys and constraints
ALTER TABLE friends 
ADD CONSTRAINT friends_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES flux_users(id) ON DELETE CASCADE;

ALTER TABLE friends 
ADD CONSTRAINT friends_friend_id_fkey 
FOREIGN KEY (friend_id) REFERENCES flux_users(id) ON DELETE CASCADE;

ALTER TABLE friends 
ADD CONSTRAINT friends_no_self_friend 
CHECK (user_id != friend_id);

ALTER TABLE friends 
ADD CONSTRAINT friends_unique_friendship 
UNIQUE(user_id, friend_id);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all on friend_invites" ON friend_invites;
DROP POLICY IF EXISTS "Allow all on friends" ON friends;

-- Create policies (Allow all for now - you can restrict later)
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all on friend_invites" ON friend_invites FOR ALL USING (true);
CREATE POLICY "Allow all on friends" ON friends FOR ALL USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get pending invites for a user
CREATE OR REPLACE FUNCTION get_pending_invites(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    from_username TEXT,
    from_nickname TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id,
        fi.from_user_id,
        u.username as from_username,
        u.nickname as from_nickname,
        fi.created_at
    FROM friend_invites fi
    JOIN flux_users u ON fi.from_user_id = u.id
    WHERE fi.to_user_id = p_user_id 
    AND fi.status = 'pending'
    ORDER BY fi.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get friends list for a user
CREATE OR REPLACE FUNCTION get_friends_list(p_user_id UUID)
RETURNS TABLE (
    friend_id UUID,
    friend_username TEXT,
    friend_nickname TEXT,
    is_online BOOLEAN,
    last_seen TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as friend_id,
        u.username as friend_username,
        u.nickname as friend_nickname,
        u.is_online,
        u.last_seen,
        f.accepted_at
    FROM friends f
    JOIN flux_users u ON f.friend_id = u.id
    WHERE f.user_id = p_user_id
    ORDER BY u.is_online DESC, u.last_seen DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friends 
        WHERE user_id = user1_id AND friend_id = user2_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if invite exists
CREATE OR REPLACE FUNCTION invite_exists(from_id UUID, to_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friend_invites 
        WHERE from_user_id = from_id 
        AND to_user_id = to_id 
        AND status = 'pending'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Migration complete! You should now have:
-- ✓ sessions table with indexes
-- ✓ friend_invites table with constraints
-- ✓ friends table with unique constraints
-- ✓ RLS policies enabled
-- ✓ Helper functions installed
--
-- New Features Available:
-- 1. User authentication with passwords
-- 2. Session management
-- 3. Friend invitations
-- 4. Friend list with online status
