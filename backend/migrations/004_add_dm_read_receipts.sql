-- Add read_by column to direct_messages table for read receipts
-- This column stores an array of objects with userId, nickname, and readAt timestamp

ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries on read_by
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_by ON direct_messages USING GIN (read_by);

-- Add comment
COMMENT ON COLUMN direct_messages.read_by IS 'Array of read receipts with userId, nickname, and readAt timestamp';
