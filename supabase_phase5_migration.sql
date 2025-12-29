-- Phase 5: Add username column to users table for onboarding flow

-- Add username column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add currency column to commitments table (for international support)
ALTER TABLE public.commitments
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JPY';

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Optional: Add unique constraint on username if you want unique usernames
-- ALTER TABLE public.users ADD CONSTRAINT unique_username UNIQUE (username);
