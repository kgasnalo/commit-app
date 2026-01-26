-- Add refund tracking fields to penalty_charges table
-- These fields support the admin refund functionality

-- Step 1: Add refund-related columns
ALTER TABLE penalty_charges
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id);

-- Step 2: Update the charge_status CHECK constraint to include refund statuses
-- First, drop the existing constraint
ALTER TABLE penalty_charges DROP CONSTRAINT IF EXISTS penalty_charges_charge_status_check;

-- Then add the new constraint with refund statuses
ALTER TABLE penalty_charges ADD CONSTRAINT penalty_charges_charge_status_check
  CHECK (charge_status IN ('pending', 'processing', 'succeeded', 'failed', 'requires_action', 'refund_pending', 'refunded'));

-- Step 3: Create index for refund queries
CREATE INDEX IF NOT EXISTS idx_penalty_charges_refunded
  ON penalty_charges(refunded_at)
  WHERE charge_status = 'refunded';

-- Add comments
COMMENT ON COLUMN penalty_charges.stripe_refund_id IS 'Stripe Refund ID when a charge has been refunded';
COMMENT ON COLUMN penalty_charges.refunded_at IS 'Timestamp when the charge was refunded';
COMMENT ON COLUMN penalty_charges.refunded_by IS 'Admin user ID who processed the refund';
