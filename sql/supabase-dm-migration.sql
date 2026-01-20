-- Flux Messenger - Direct Messages Migration
-- Run this in your Supabase SQL Editor to add DM functionality

-- =====================================================
-- USERS TABLE (for @username system)
-- =====================================================
-- Check if users table already exists with different structure
DO $$ 
BEGIN
    -- Drop old users table if it exists without username column
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
        AND NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'username'
        )
    ) THEN
        DROP TABLE IF EXISTS users CASCADE;
    END IF;
END $$;

-- Create users table with @username support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL, -- @username format
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username ~ '^@[a-zA-Z0-9_]{3,20}$')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- =====================================================
-- DIRECT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Create indexes for DMs
CREATE INDEX IF NOT EXISTS idx_dm_from_user ON direct_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_to_user ON direct_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(from_user_id, to_user_id, created_at DESC);

-- =====================================================
-- UPDATE EXISTING TABLES
-- =====================================================
-- Add user_id to participants table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE participants ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update rooms table to reference users
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'creator_id'
    ) THEN
        -- Drop existing constraint if any
        ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_creator_id_fkey;
        -- Add new constraint
        ALTER TABLE rooms ADD CONSTRAINT rooms_creator_id_fkey 
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on direct_messages" ON direct_messages;

-- Create policies (Allow all for now - you can restrict later)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on direct_messages" ON direct_messages FOR ALL USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get conversation between two users
CREATE OR REPLACE FUNCTION get_conversation(user1_id UUID, user2_id UUID)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    to_user_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN,
    from_username TEXT,
    from_nickname TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.from_user_id,
        dm.to_user_id,
        dm.content,
        dm.created_at,
        dm.is_deleted,
        u.username as from_username,
        u.nickname as from_nickname
    FROM direct_messages dm
    JOIN users u ON dm.from_user_id = u.id
    WHERE 
        (dm.from_user_id = user1_id AND dm.to_user_id = user2_id)
        OR (dm.from_user_id = user2_id AND dm.to_user_id = user1_id)
    ORDER BY dm.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all conversations for a user
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE (
    other_user_id UUID,
    other_username TEXT,
    other_nickname TEXT,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH conversations AS (
        SELECT DISTINCT
            CASE 
                WHEN dm.from_user_id = user_id THEN dm.to_user_id
                ELSE dm.from_user_id
            END as other_id
        FROM direct_messages dm
        WHERE dm.from_user_id = user_id OR dm.to_user_id = user_id
    ),
    last_messages AS (
        SELECT DISTINCT ON (
            CASE 
                WHEN dm.from_user_id = user_id THEN dm.to_user_id
                ELSE dm.from_user_id
            END
        )
            CASE 
                WHEN dm.from_user_id = user_id THEN dm.to_user_id
                ELSE dm.from_user_id
            END as other_id,
            dm.content,
            dm.created_at
        FROM direct_messages dm
        WHERE dm.from_user_id = user_id OR dm.to_user_id = user_id
        ORDER BY 
            CASE 
                WHEN dm.from_user_id = user_id THEN dm.to_user_id
                ELSE dm.from_user_id
            END,
            dm.created_at DESC
    )
    SELECT 
        c.other_id,
        u.username,
        u.nickname,
        lm.content,
        lm.created_at,
        0::BIGINT as unread_count
    FROM conversations c
    JOIN users u ON c.other_id = u.id
    LEFT JOIN last_messages lm ON c.other_id = lm.other_id
    ORDER BY lm.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Verify tables were created
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'users table created successfully';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'direct_messages') THEN
        RAISE NOTICE 'direct_messages table created successfully';
    END IF;
END $$;

-- Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('users', 'direct_messages')
ORDER BY table_name, ordinal_position;
