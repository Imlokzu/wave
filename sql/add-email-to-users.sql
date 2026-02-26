-- Add email column to flux_users table
-- Run this in Supabase SQL Editor

ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_flux_users_email ON flux_users(email);

-- Add email format check constraint (optional but recommended)
ALTER TABLE flux_users 
DROP CONSTRAINT IF EXISTS valid_email_format;

ALTER TABLE flux_users 
ADD CONSTRAINT valid_email_format 
CHECK (
    email IS NULL OR 
    (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'flux_users' AND column_name = 'email';
