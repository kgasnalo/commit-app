-- Fix storage policy over-permission
-- Issue: "Authenticated users can upload donation proofs" allows any authenticated user to upload
-- This is redundant with the Founder-only policy and creates a security hole

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload donation proofs" ON storage.objects;

-- Ensure Founder-only policy exists for donation-proofs bucket
-- (Should already exist from 20260119140000_add_admin_donation_policies.sql)
-- Re-create it to be safe
DROP POLICY IF EXISTS "Founders can upload donation proofs" ON storage.objects;
CREATE POLICY "Founders can upload donation proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'donation-proofs'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Also ensure Founders can view/delete their uploads
DROP POLICY IF EXISTS "Founders can view donation proofs" ON storage.objects;
CREATE POLICY "Founders can view donation proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'donation-proofs'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

DROP POLICY IF EXISTS "Founders can delete donation proofs" ON storage.objects;
CREATE POLICY "Founders can delete donation proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'donation-proofs'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );
