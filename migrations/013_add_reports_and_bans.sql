-- Migration: Add reports and bans system
-- Description: Adds tables for bug reports, pro requests, scam reports, and user bans

-- First, add is_admin column if it doesn't exist (from migration 010)
ALTER TABLE flux_users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON flux_users(is_admin) WHERE is_admin = TRUE;

-- Bug Reports Table
CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'bug', 'feature', 'other'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'closed'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pro Requests Table
CREATE TABLE IF NOT EXISTS pro_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    processed_by UUID REFERENCES flux_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Scam Reports Table
CREATE TABLE IF NOT EXISTS scam_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence TEXT, -- URLs, screenshots, etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'dismissed'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Bans Table
CREATE TABLE IF NOT EXISTS user_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
    banned_by UUID REFERENCES flux_users(id),
    reason TEXT NOT NULL,
    ban_type TEXT DEFAULT 'permanent', -- 'temporary', 'permanent'
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent bans
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lifted_at TIMESTAMP WITH TIME ZONE,
    lifted_by UUID REFERENCES flux_users(id)
);

-- Add is_banned column to users table
ALTER TABLE flux_users 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_pro_requests_user_id ON pro_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_requests_status ON pro_requests(status);
CREATE INDEX IF NOT EXISTS idx_scam_reports_reporter ON scam_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_scam_reports_reported ON scam_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_scam_reports_status ON scam_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON flux_users(is_banned) WHERE is_banned = TRUE;

-- Comments
COMMENT ON TABLE bug_reports IS 'User-submitted bug reports and feature requests';
COMMENT ON TABLE pro_requests IS 'User requests for pro status';
COMMENT ON TABLE scam_reports IS 'User reports of scam/fraud by other users';
COMMENT ON TABLE user_bans IS 'User ban records with expiration support';
COMMENT ON COLUMN flux_users.is_banned IS 'Whether the user is currently banned';
