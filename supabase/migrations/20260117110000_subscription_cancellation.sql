-- Migration: Subscription Cancellation Support
-- Adds 'cancelled' status to commitments and creates cancellation tracking table

-- Step 1: Add 'cancelled' status to commitments
-- Drop existing constraint if it exists
ALTER TABLE commitments
DROP CONSTRAINT IF EXISTS commitments_status_check;

-- Add new constraint with 'cancelled' status
ALTER TABLE commitments
ADD CONSTRAINT commitments_status_check
CHECK (status IN ('pending', 'completed', 'defaulted', 'cancelled'));

-- Step 2: Create subscription_cancellations table for analytics/audit
CREATE TABLE IF NOT EXISTS subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  cancelled_commitments INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE subscription_cancellations ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Users can insert their own cancellation record
CREATE POLICY "Users can insert own cancellation"
ON subscription_cancellations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can read their own cancellation records
CREATE POLICY "Users can read own cancellations"
ON subscription_cancellations FOR SELECT
USING (auth.uid() = user_id);

-- Step 5: Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_user_id
ON subscription_cancellations(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_created_at
ON subscription_cancellations(created_at);
