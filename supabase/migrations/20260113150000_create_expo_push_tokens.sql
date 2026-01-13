-- Phase 7.3: Push Notification Infrastructure
-- Creates expo_push_tokens table to store device push tokens

CREATE TABLE expo_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- Create index for faster lookups by user_id
CREATE INDEX idx_expo_push_tokens_user_id ON expo_push_tokens(user_id);

-- Create index for active tokens
CREATE INDEX idx_expo_push_tokens_active ON expo_push_tokens(user_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can INSERT their own tokens
CREATE POLICY "Users can insert own push tokens"
  ON expo_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can SELECT their own tokens
CREATE POLICY "Users can select own push tokens"
  ON expo_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can UPDATE their own tokens
CREATE POLICY "Users can update own push tokens"
  ON expo_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can DELETE their own tokens
CREATE POLICY "Users can delete own push tokens"
  ON expo_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can read all tokens (for Edge Functions)
CREATE POLICY "Service role can read all tokens"
  ON expo_push_tokens FOR SELECT
  TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expo_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_expo_push_tokens_updated_at
  BEFORE UPDATE ON expo_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_expo_push_tokens_updated_at();
