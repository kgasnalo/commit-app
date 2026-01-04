-- Phase 8 Debug Fix: Add missing RLS policies and updated_at column
-- Execute this SQL in Supabase SQL Editor

-- 1. Add updated_at column to commitments table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'commitments'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.commitments
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Set updated_at to created_at for existing records
        UPDATE public.commitments
        SET updated_at = created_at
        WHERE updated_at IS NULL;
    END IF;
END $$;

-- 2. Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_commitments_updated_at ON public.commitments;
CREATE TRIGGER update_commitments_updated_at
    BEFORE UPDATE ON public.commitments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Add missing RLS policies for commitments UPDATE
DROP POLICY IF EXISTS "Users can update their own commitments" ON public.commitments;
CREATE POLICY "Users can update their own commitments"
    ON public.commitments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Add missing RLS policy for verification_logs INSERT
DROP POLICY IF EXISTS "Users can insert their own verification logs" ON public.verification_logs;
CREATE POLICY "Users can insert their own verification logs"
    ON public.verification_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.commitments
            WHERE commitments.id = verification_logs.commitment_id
            AND commitments.user_id = auth.uid()
        )
    );

-- 5. Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('commitments', 'verification_logs')
ORDER BY tablename, cmd;
