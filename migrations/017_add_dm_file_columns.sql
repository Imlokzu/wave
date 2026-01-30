-- Migration 017: Add file handling columns to direct_messages table
-- This allows proper file attachments in DMs with original filenames preserved

-- Add file_url column for file attachments
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add file_name column to preserve original filename
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add file_size column for file size in bytes
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add image_url column for image attachments
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add message_type column to distinguish text/image/file messages
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Create index on message_type for faster queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_type 
ON direct_messages(message_type);

-- Add check constraint for message_type
ALTER TABLE direct_messages 
ADD CONSTRAINT IF NOT EXISTS valid_message_type 
CHECK (message_type IN ('text', 'image', 'file', 'voice', 'system'));

COMMENT ON COLUMN direct_messages.file_url IS 'URL of uploaded file (Supabase storage)';
COMMENT ON COLUMN direct_messages.file_name IS 'Original filename as uploaded by user';
COMMENT ON COLUMN direct_messages.file_size IS 'File size in bytes';
COMMENT ON COLUMN direct_messages.image_url IS 'URL of uploaded image (Supabase storage)';
COMMENT ON COLUMN direct_messages.message_type IS 'Type of message: text, image, file, voice, or system';
