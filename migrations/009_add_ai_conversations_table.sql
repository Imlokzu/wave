-- Migration: Add AI Conversations Table
-- Description: Store user AI chat conversations in Supabase

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    model TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- Add comment
COMMENT ON TABLE ai_conversations IS 'Stores user AI chat conversations with full history';
