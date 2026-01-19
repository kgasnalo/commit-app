-- Add onboarding_completed flag to users table
-- This distinguishes between "new users needing onboarding" vs "existing users with expired subscription"

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Set existing users with subscription_status='active' as completed
-- (They must have completed onboarding to get active subscription)
UPDATE public.users
SET onboarding_completed = true
WHERE subscription_status = 'active';

-- Also mark users who have any commitments as completed
-- (If they have commitments, they went through onboarding)
UPDATE public.users u
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM public.commitments c WHERE c.user_id = u.id
);

-- Add comment for documentation
COMMENT ON COLUMN public.users.onboarding_completed IS 'True if user has completed onboarding flow at least once. Used to skip onboarding for returning users.';
