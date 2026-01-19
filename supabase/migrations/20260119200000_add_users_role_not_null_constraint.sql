-- Migration: Add NOT NULL constraint to users.role column
-- This ensures all users have a valid role, preventing NULL values that could bypass admin RLS policies

-- Step 1: Fill existing NULL values with 'Other' (safe default)
UPDATE users SET role = 'Other' WHERE role IS NULL;

-- Step 2: Set default value for new rows
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Other';

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Note: This migration is safe because:
-- 1. We first fill any NULL values
-- 2. Then set a default for future inserts
-- 3. Finally add the NOT NULL constraint
