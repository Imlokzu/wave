-- Add is_pro column to flux_users table for easier access
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;

-- Create index for faster pro user queries
CREATE INDEX IF NOT EXISTS idx_flux_users_is_pro ON flux_users(is_pro);

-- Create function to sync is_pro status from subscriptions
CREATE OR REPLACE FUNCTION sync_user_pro_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update flux_users.is_pro based on subscription status
  UPDATE flux_users
  SET is_pro = (
    NEW.tier = 'pro' AND (NEW.end_date IS NULL OR NEW.end_date > NOW())
  )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync is_pro when subscription changes
DROP TRIGGER IF EXISTS sync_pro_status_on_subscription_change ON subscriptions;
CREATE TRIGGER sync_pro_status_on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_pro_status();

-- Sync existing subscriptions
UPDATE flux_users u
SET is_pro = (
  SELECT (s.tier = 'pro' AND (s.end_date IS NULL OR s.end_date > NOW()))
  FROM subscriptions s
  WHERE s.user_id = u.id
);

-- Set default to false for users without subscriptions
UPDATE flux_users
SET is_pro = false
WHERE id NOT IN (SELECT user_id FROM subscriptions);

-- Create default free subscriptions for users who don't have one
INSERT INTO subscriptions (user_id, tier, start_date, auto_renew)
SELECT id, 'free', NOW(), false
FROM flux_users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;
