-- Add payment_method_registered column to users table
-- This flag indicates whether the user has registered a payment method for penalties

ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method_registered BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.payment_method_registered IS 'Whether the user has registered a payment method for penalty charges via Stripe';
