-- Add legal_consent_version column to users table
-- This tracks which version of Terms/Privacy the user has agreed to
-- NULL means never agreed (new user or migrated user)

ALTER TABLE users
ADD COLUMN legal_consent_version TEXT DEFAULT NULL;

-- Add index for efficient querying of users who need to re-consent
CREATE INDEX idx_users_legal_consent_version ON users(legal_consent_version);

-- Comment for documentation
COMMENT ON COLUMN users.legal_consent_version IS 'Version of Terms/Privacy user agreed to (e.g., "v1", "v2"). NULL = never agreed.';
