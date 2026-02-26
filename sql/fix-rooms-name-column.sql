-- Fix: Add missing 'name' column to rooms table
-- Run this in Supabase SQL Editor

-- Add name column if it doesn't exist
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'name';

-- Refresh Supabase schema cache (important!)
-- After running this, go to Supabase Dashboard → API Settings → Click "Refresh Cache"
