-- Phase 7.6: Restrict commitment INSERT to service_role only
-- This forces all commitment creation through the create-commitment Edge Function

-- Drop the INSERT policy that allows authenticated users to insert directly
DROP POLICY IF EXISTS "Users can create their own commitments" ON public.commitments;

-- No new INSERT policy is created.
-- This means:
-- 1. RLS defaults to DENY when no matching policy exists
-- 2. service_role bypasses RLS entirely (used by Edge Functions)
-- 3. Authenticated users cannot INSERT directly, must use Edge Function
--
-- This matches the existing DELETE behavior (no policy = denied)
-- and ensures all commitment creation goes through server-side validation.
