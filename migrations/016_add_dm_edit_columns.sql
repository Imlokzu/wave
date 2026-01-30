-- Migration 016: Add edit tracking columns to direct_messages table
-- This allows users to edit their DM messages within 48 hours

-- Add is_edited column
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add edited_at column
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add read_by column if it doesn't exist (for read receipts)
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]'::jsonb;

-- Create index on edited messages for faster queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_edited 
ON direct_messages(is_edited) 
WHERE is_edited = TRUE;

-- Create index on read_by for faster read receipt queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_by 
ON direct_messages USING GIN(read_by);

COMMENT ON COLUMN direct_messages.is_edited IS 'Whether the message has been edited';
COMMENT ON COLUMN direct_messages.edited_at IS 'Timestamp when the message was last edited';
COMMENT ON COLUMN direct_messages.read_by IS 'Array of users who have read this message with timestamps';
