-- Add email column to flux_users table
-- Migration 014

ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_flux_users_email ON flux_users(email);

-- Add email format check constraint
ALTER TABLE flux_users 
DROP CONSTRAINT IF EXISTS valid_email_format;

ALTER TABLE flux_users 
ADD CONSTRAINT valid_email_format 
CHECK (
    email IS NULL OR 
    (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
