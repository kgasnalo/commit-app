-- Migration: Add username uniqueness constraint and validation
-- This migration adds:
-- 1. Deduplication of existing usernames (case-insensitive)
-- 2. NOT NULL constraint on username
-- 3. Case-insensitive UNIQUE INDEX
-- 4. CHECK constraint for format validation (3-20 chars, alphanumeric + underscore)
-- 5. RPC function for availability check

-- Step 1: Fix existing duplicates (append _2, _3, etc. to later entries)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT LOWER(username), COUNT(*)
    FROM users WHERE username IS NOT NULL
    GROUP BY LOWER(username) HAVING COUNT(*) > 1
  ) d;

  IF duplicate_count > 0 THEN
    WITH ranked AS (
      SELECT id, username,
        ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at) as rn
      FROM users WHERE username IS NOT NULL
    )
    UPDATE users u SET username = r.username || '_' || r.rn
    FROM ranked r WHERE u.id = r.id AND r.rn > 1;
  END IF;
END $$;

-- Step 2: Set placeholder username for NULL entries
UPDATE users
SET username = 'user_' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE username IS NULL;

-- Step 3: Fix any usernames that don't match the new format constraint
-- (before adding the CHECK constraint)
UPDATE users
SET username = 'user_' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE username !~ '^[a-zA-Z0-9_]{3,20}$';

-- Step 4: NOT NULL constraint
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Step 5: Case-insensitive UNIQUE INDEX
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique_lower
ON users (LOWER(username));

-- Step 6: CHECK constraint (3-20 chars, letters/numbers/underscore only)
ALTER TABLE users
ADD CONSTRAINT username_format_check
CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Step 7: RPC function for username availability check
CREATE OR REPLACE FUNCTION check_username_available(
  p_username TEXT,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM users
    WHERE LOWER(username) = LOWER(p_username)
      AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
  );
END;
$$;
