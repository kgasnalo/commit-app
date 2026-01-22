-- Migration: Add job_category column to users table
-- This enables "Popular books among your profession" feature

-- Add job_category column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_category TEXT;

-- Create index for efficient filtering by job category
CREATE INDEX IF NOT EXISTS idx_users_job_category ON users(job_category);

-- Add comment for documentation
COMMENT ON COLUMN users.job_category IS 'User profession category: engineer, designer, pm, marketing, sales, hr, cs, founder, other';
