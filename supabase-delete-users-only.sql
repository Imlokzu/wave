-- =====================================================
-- DELETE ONLY USERS (NOT FRIENDS DATA)
-- =====================================================
-- WARNING: This will permanently delete ALL users!
-- Run this in your Supabase SQL Editor

-- Delete users only (cascade will handle related sessions)
DELETE FROM flux_users WHERE true;

-- Verify deletion
SELECT 'Users deleted' as status, COUNT(*) as remaining_users FROM flux_users;
