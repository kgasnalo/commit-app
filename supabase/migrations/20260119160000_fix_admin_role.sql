-- Update admin user role to Founder
-- This allows the admin to upload donation proofs and manage donations

-- Update the admin user's role (replace with actual admin email)
UPDATE users
SET role = 'Founder'
WHERE email = 'xagent000.xxx@gmail.com';

-- Also add a fallback policy that allows authenticated users to upload to donation-proofs bucket
-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Authenticated users can upload donation proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload donation proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'donation-proofs'
  );
