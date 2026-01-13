-- Phase 7.5: Row Level Security (RLS) Hardening
-- Lock down commitments table to prevent cheating

-- 1. Reset Policies
DROP POLICY IF EXISTS "Users can view their own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can create their own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can update own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can delete own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can update own commitments to complete" ON public.commitments;

-- 2. Re-create Basic Policies

-- SELECT: Users can view their own commitments
CREATE POLICY "Users can view their own commitments" 
ON public.commitments FOR SELECT 
USING (auth.uid() = user_id);

-- INSERT: Users can create their own commitments
CREATE POLICY "Users can create their own commitments" 
ON public.commitments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Hardened UPDATE Policy
-- STRICT RULES:
-- 1. Can only update IF current status is 'pending' (active)
-- 2. Can only update IF deadline has NOT passed (Server-time check)
-- 3. Can ONLY set status to 'completed' (No other changes allowed by intent, though RLS primarily checks rows)
--    (Note: This prevents setting 'frozen' or 'defaulted' manually)

CREATE POLICY "Users can complete their own active commitments" 
ON public.commitments FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = user_id 
  AND status = 'pending' 
  AND deadline > NOW()
)
WITH CHECK (
  status = 'completed'
);

-- 4. DELETE Policy
-- Intentionally OMITTED. 
-- Users cannot delete commitments.
