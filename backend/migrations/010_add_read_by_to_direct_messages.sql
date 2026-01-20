-- Add read_by column to direct_messages table for read receipts
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_by 
ON direct_messages USING GIN (read_by);

-- Add comment
COMMENT ON COLUMN direct_messages.read_by IS 'Array of users who have read this message with timestamps';
