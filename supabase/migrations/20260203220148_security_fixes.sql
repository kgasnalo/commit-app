-- Security Fix Migration
-- Purpose: Remove overly permissive public upload policy from book-covers bucket
-- Issue: C1 - Unauthenticated file uploads pose malware/DoS risk

BEGIN;

-- ============================================================
-- C1: Remove book-covers public upload policy
-- ============================================================
-- The policy "Allow public uploads for book covers" was created in
-- 20260116000000_allow_public_uploads.sql to support onboarding.
-- However, this is a security risk as it allows anyone to upload files.
--
-- Solution: Remove the public policy. Onboarding will need to either:
-- 1. Handle cover uploads after authentication
-- 2. Use a signed URL approach
-- 3. Store cover URLs directly without uploading

DROP POLICY IF EXISTS "Allow public uploads for book covers" ON storage.objects;

-- Ensure authenticated users can still upload to book-covers
-- (This policy likely already exists, but adding IF NOT EXISTS for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Authenticated users can upload book covers'
  ) THEN
    CREATE POLICY "Authenticated users can upload book covers"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'book-covers');
  END IF;
END $$;

COMMIT;
