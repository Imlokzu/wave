-- Flux Messenger - Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- This script is idempotent - safe to run multiple times

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FLUX_USERS TABLE (for @username system)
-- Note: Using 'flux_users' to avoid conflicts with Supabase auth.users
-- =====================================================
CREATE TABLE IF NOT EXISTS flux_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL, -- @username format
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'username_format' 
        AND conrelid = 'flux_users'::regclass
    ) THEN
        ALTER TABLE flux_users ADD CONSTRAINT username_format 
        CHECK (username ~ '^@[a-zA-Z0-9_]{3,20}$');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flux_users_username ON flux_users(username);
CREATE INDEX IF NOT EXISTS idx_flux_users_nickname ON flux_users(nickname);

-- =====================================================
-- DIRECT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'direct_messages_from_user_id_fkey'
    ) THEN
        ALTER TABLE direct_messages 
        ADD CONSTRAINT direct_messages_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES flux_users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'direct_messages_to_user_id_fkey'
    ) THEN
        ALTER TABLE direct_messages 
        ADD CONSTRAINT direct_messages_to_user_id_fkey 
        FOREIGN KEY (to_user_id) REFERENCES flux_users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'different_users'
        AND conrelid = 'direct_messages'::regclass
    ) THEN
        ALTER TABLE direct_messages 
        ADD CONSTRAINT different_users 
        CHECK (from_user_id != to_user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dm_from_user ON direct_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_to_user ON direct_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(from_user_id, to_user_id, created_at DESC);

-- =====================================================
-- ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    max_users INTEGER DEFAULT 50,
    is_locked BOOLEAN DEFAULT FALSE,
    creator_id UUID,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Add foreign key to flux_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rooms_creator_id_fkey'
    ) THEN
        ALTER TABLE rooms 
        ADD CONSTRAINT rooms_creator_id_fkey 
        FOREIGN KEY (creator_id) REFERENCES flux_users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);

-- =====================================================
-- PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    room_id UUID,
    nickname VARCHAR(100) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_moderator BOOLEAN DEFAULT FALSE,
    socket_id VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'participants_user_id_fkey'
    ) THEN
        ALTER TABLE participants 
        ADD CONSTRAINT participants_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES flux_users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'participants_room_id_fkey'
    ) THEN
        ALTER TABLE participants 
        ADD CONSTRAINT participants_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID,
    sender_id UUID,
    sender_nickname VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'normal', -- normal, system, fake, image, ai, file, voice, poll
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    voice_url TEXT,
    voice_duration INTEGER, -- Duration in seconds
    spoof_source VARCHAR(100),
    edited_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN DEFAULT FALSE,
    pinned_at TIMESTAMP WITH TIME ZONE,
    reactions JSONB DEFAULT '[]'::jsonb,
    poll_data JSONB -- {question, options: [{id, text, votes: []}], allowMultiple, isClosed}
);

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_room_id_fkey'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES participants(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at);

-- =====================================================
-- MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID,
    user_id UUID,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_reactions_message_id_fkey'
    ) THEN
        ALTER TABLE message_reactions 
        ADD CONSTRAINT message_reactions_message_id_fkey 
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_reactions_user_id_fkey'
    ) THEN
        ALTER TABLE message_reactions 
        ADD CONSTRAINT message_reactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES participants(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- =====================================================
-- POLLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID,
    creator_id UUID,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- [{text: "Option 1", votes: 0}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'polls_room_id_fkey'
    ) THEN
        ALTER TABLE polls 
        ADD CONSTRAINT polls_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'polls_creator_id_fkey'
    ) THEN
        ALTER TABLE polls 
        ADD CONSTRAINT polls_creator_id_fkey 
        FOREIGN KEY (creator_id) REFERENCES participants(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_polls_room ON polls(room_id);

-- =====================================================
-- POLL VOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID,
    user_id UUID,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'poll_votes_poll_id_fkey'
    ) THEN
        ALTER TABLE poll_votes 
        ADD CONSTRAINT poll_votes_poll_id_fkey 
        FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'poll_votes_user_id_fkey'
    ) THEN
        ALTER TABLE poll_votes 
        ADD CONSTRAINT poll_votes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES participants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE flux_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all on flux_users" ON flux_users;
DROP POLICY IF EXISTS "Allow all on direct_messages" ON direct_messages;
DROP POLICY IF EXISTS "Allow all on rooms" ON rooms;
DROP POLICY IF EXISTS "Allow all on participants" ON participants;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "Allow all on reactions" ON message_reactions;
DROP POLICY IF EXISTS "Allow all on polls" ON polls;
DROP POLICY IF EXISTS "Allow all on poll_votes" ON poll_votes;

-- Create policies (Allow all for now - you can restrict later)
CREATE POLICY "Allow all on flux_users" ON flux_users FOR ALL USING (true);
CREATE POLICY "Allow all on direct_messages" ON direct_messages FOR ALL USING (true);
CREATE POLICY "Allow all on rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all on participants" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all on reactions" ON message_reactions FOR ALL USING (true);
CREATE POLICY "Allow all on polls" ON polls FOR ALL USING (true);
CREATE POLICY "Allow all on poll_votes" ON poll_votes FOR ALL USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM messages 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old rooms (optional)
CREATE OR REPLACE FUNCTION cleanup_old_rooms()
RETURNS void AS $$
BEGIN
    DELETE FROM rooms 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
        SELECT 1 FROM participants 
        WHERE participants.room_id = rooms.id
    );
END;
$$ LANGUAGE plpgsql;

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
    JOIN flux_users u ON dm.from_user_id = u.id
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
    JOIN flux_users u ON c.other_id = u.id
    LEFT JOIN last_messages lm ON c.other_id = lm.other_id
    ORDER BY lm.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    user_count INTEGER;
    dm_count INTEGER;
    room_count INTEGER;
BEGIN
    -- Check tables exist
    SELECT COUNT(*) INTO user_count FROM flux_users;
    SELECT COUNT(*) INTO dm_count FROM direct_messages;
    SELECT COUNT(*) INTO room_count FROM rooms;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Flux Messenger Database Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ flux_users table: % users', user_count;
    RAISE NOTICE '✓ direct_messages table: % messages', dm_count;
    RAISE NOTICE '✓ rooms table: % rooms', room_count;
    RAISE NOTICE '✓ All tables and indexes created';
    RAISE NOTICE '✓ RLS policies enabled';
    RAISE NOTICE '✓ Helper functions installed';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create storage buckets: flux-images, flux-files, flux-voice';
    RAISE NOTICE '2. Run supabase-storage-policies.sql for storage access';
    RAISE NOTICE '3. Start your server: npm run build && npm start';
    RAISE NOTICE '4. Access DMs at: http://localhost:3000/dms.html';
    RAISE NOTICE '========================================';
END $$;
