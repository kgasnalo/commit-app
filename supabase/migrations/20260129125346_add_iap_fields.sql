-- Add IAP (In-App Purchase) fields to users table
-- These fields store Apple IAP subscription information

-- Apple original transaction ID (used to link webhooks to users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT;

-- Subscription expiration timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Subscription platform (apple, google, web, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_platform TEXT;

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_users_apple_original_transaction_id
  ON users(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.apple_original_transaction_id IS 'Apple IAP original transaction ID for linking App Store webhooks';
COMMENT ON COLUMN users.subscription_expires_at IS 'Subscription expiration timestamp';
COMMENT ON COLUMN users.subscription_platform IS 'Platform where subscription was purchased (apple, google, web)';
