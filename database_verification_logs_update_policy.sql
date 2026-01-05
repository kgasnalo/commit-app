-- Add UPDATE policy for verification_logs table
-- This allows users to edit their memo after completion

DROP POLICY IF EXISTS "Users can update their own verification logs" ON public.verification_logs;

CREATE POLICY "Users can update their own verification logs"
    ON public.verification_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.commitments
            WHERE commitments.id = verification_logs.commitment_id
            AND commitments.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.commitments
            WHERE commitments.id = verification_logs.commitment_id
            AND commitments.user_id = auth.uid()
        )
    );
