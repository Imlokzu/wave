-- Migration: Add message reports table
-- Description: Allow users to report inappropriate messages

CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  message_content TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter ON message_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reported_user ON message_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);
CREATE INDEX IF NOT EXISTS idx_message_reports_created_at ON message_reports(created_at DESC);

-- Disable RLS (using custom auth)
ALTER TABLE message_reports DISABLE ROW LEVEL SECURITY;
