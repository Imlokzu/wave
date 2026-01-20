-- Migration: Add admin role to users
-- Description: Adds is_admin column to users table for admin panel access

-- Add is_admin column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Add comment
COMMENT ON COLUMN users.is_admin IS 'Whether the user has admin privileges';
