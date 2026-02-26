-- =====================================================
-- PUSH NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subscription->>'endpoint')
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Enable Realtime for push_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- Enable Realtime for direct_messages (for real-time DM notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Function to notify on new DM
CREATE OR REPLACE FUNCTION notify_new_dm()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the recipient's personal channel
  PERFORM pg_notify(
    'dm_notifications:' || NEW.to_user_id::text,
    json_build_object(
      'id', NEW.id,
      'from_user_id', NEW.from_user_id,
      'content', NEW.content,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new DM notifications
DROP TRIGGER IF EXISTS on_new_dm ON direct_messages;
CREATE TRIGGER on_new_dm
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_dm();
