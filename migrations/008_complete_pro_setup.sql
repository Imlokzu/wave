-- Complete Pro/Free user setup migration
-- Run this migration to set up the entire Pro system

-- Step 1: Add is_pro column to flux_users table
ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;

-- Create index for faster pro user queries
CREATE INDEX IF NOT EXISTS idx_flux_users_is_pro ON flux_users(is_pro);

-- Step 2: Fix subscriptions foreign key to reference flux_users
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES flux_users(id) ON DELETE CASCADE;

-- Step 3: Disable RLS (not using Supabase Auth)
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;

-- Step 4: Create function to sync is_pro status from subscriptions
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

-- Step 5: Create trigger to automatically sync is_pro when subscription changes
DROP TRIGGER IF EXISTS sync_pro_status_on_subscription_change ON subscriptions;
CREATE TRIGGER sync_pro_status_on_subscription_change
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_pro_status();

-- Step 6: Create default free subscriptions for existing flux_users
INSERT INTO subscriptions (user_id, tier, start_date, auto_renew)
SELECT id, 'free', NOW(), false
FROM flux_users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Step 7: Sync existing subscriptions with flux_users
UPDATE flux_users u
SET is_pro = (
  SELECT COALESCE(
    (s.tier = 'pro' AND (s.end_date IS NULL OR s.end_date > NOW())),
    false
  )
  FROM subscriptions s
  WHERE s.user_id = u.id
)
WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);

-- Step 8: Set default to false for users without subscriptions
UPDATE flux_users
SET is_pro = false
WHERE id NOT IN (SELECT user_id FROM subscriptions);

-- Verification queries (optional - comment out if not needed)
-- SELECT COUNT(*) as total_users FROM flux_users;
-- SELECT COUNT(*) as users_with_subscriptions FROM subscriptions;
-- SELECT COUNT(*) as pro_users FROM flux_users WHERE is_pro = true;
-- SELECT COUNT(*) as free_users FROM flux_users WHERE is_pro = false;
