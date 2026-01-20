-- =====================================================
-- DELETE ALL USERS FROM SUPABASE
-- =====================================================
-- WARNING: This will permanently delete ALL user data!
-- Run this in your Supabase SQL Editor

-- Delete all data from related tables first (due to foreign keys)
-- Only delete from tables that exist
DELETE FROM sessions WHERE true;
DELETE FROM friend_invites WHERE true;
DELETE FROM friends WHERE true;
DELETE FROM flux_users WHERE true;

-- Verify deletion
SELECT 'Users deleted' as status, COUNT(*) as remaining_users FROM flux_users;
SELECT 'Sessions deleted' as status, COUNT(*) as remaining_sessions FROM sessions;
SELECT 'Friend invites deleted' as status, COUNT(*) as remaining_invites FROM friend_invites;
SELECT 'Friends deleted' as status, COUNT(*) as remaining_friends FROM friends;
