-- Flux Messenger - Migration Script for Existing Database
-- Run this if you already have tables and just want to add new columns

-- Add new columns to messages table (if they don't exist)
DO $$ 
BEGIN
    -- Add file-related columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='file_url') THEN
        ALTER TABLE messages ADD COLUMN file_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='file_name') THEN
        ALTER TABLE messages ADD COLUMN file_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='file_size') THEN
        ALTER TABLE messages ADD COLUMN file_size BIGINT;
    END IF;
    
    -- Add voice-related columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='voice_url') THEN
        ALTER TABLE messages ADD COLUMN voice_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='voice_duration') THEN
        ALTER TABLE messages ADD COLUMN voice_duration INTEGER;
    END IF;
    
    -- Add edit/delete tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='is_edited') THEN
        ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='is_deleted') THEN
        ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='deleted_at') THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add pinned message tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='pinned_at') THEN
        ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add poll data column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='poll_data') THEN
        ALTER TABLE messages ADD COLUMN poll_data JSONB;
    END IF;
END $$;

-- Update the type column to support new message types
-- This is safe to run multiple times
COMMENT ON COLUMN messages.type IS 'Message type: normal, system, fake, image, ai, file, voice, poll';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed successfully! New columns added to messages table.';
END $$;
