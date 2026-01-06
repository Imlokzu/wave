-- Add avatar_url column to flux_users table
ALTER TABLE flux_users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_flux_users_avatar_url ON flux_users(avatar_url);

-- Add comment
COMMENT ON COLUMN flux_users.avatar_url IS 'URL path to user profile picture';

