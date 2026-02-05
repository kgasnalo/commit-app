-- One-Time Token (OTT) table for cross-app authentication
-- Used to seamlessly authenticate users from mobile app to web portal

CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);

-- RLS: Only service_role can access (Edge Functions use service_role)
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role can access
-- This is intentional for security

COMMENT ON TABLE auth_tokens IS 'One-time authentication tokens for cross-app SSO (mobile app → web portal)';
COMMENT ON COLUMN auth_tokens.token IS '64-character cryptographically random token';
COMMENT ON COLUMN auth_tokens.expires_at IS 'Token expires 5 minutes after creation';
COMMENT ON COLUMN auth_tokens.used_at IS 'Set when token is consumed, prevents reuse';
