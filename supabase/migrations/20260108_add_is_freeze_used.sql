-- Add is_freeze_used column to commitments table
ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS is_freeze_used BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.commitments.is_freeze_used IS 'Flag indicating if the emergency freeze (lifeline) was used for this commitment.';
