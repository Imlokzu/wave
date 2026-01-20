-- Fix subscriptions table to reference flux_users instead of auth.users

-- Drop existing foreign key constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

-- Add new foreign key constraint referencing flux_users
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES flux_users(id) ON DELETE CASCADE;

-- Update RLS policies to work with flux_users
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;

-- Disable RLS for now (since we're not using auth.uid() with flux_users)
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Create default free subscriptions for existing flux_users
INSERT INTO subscriptions (user_id, tier, start_date, auto_renew)
SELECT id, 'free', NOW(), false
FROM flux_users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Update the sync trigger function to work with flux_users
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_pro_status_on_subscription_change ON subscriptions;
CREATE TRIGGER sync_pro_status_on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_pro_status();

-- Sync existing subscriptions with flux_users
UPDATE flux_users u
SET is_pro = (
  SELECT (s.tier = 'pro' AND (s.end_date IS NULL OR s.end_date > NOW()))
  FROM subscriptions s
  WHERE s.user_id = u.id
)
WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);

-- Set default to false for users without subscriptions
UPDATE flux_users
SET is_pro = false
WHERE id NOT IN (SELECT user_id FROM subscriptions);
