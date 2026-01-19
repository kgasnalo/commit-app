-- Add policies for admin to manage donations and upload proofs
-- Admin users have 'admin' role in users table

-- Allow admin users to insert donations
CREATE POLICY "Admin can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Allow admin users to update donations
CREATE POLICY "Admin can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Allow admin users to delete donations
CREATE POLICY "Admin can delete donations"
  ON donations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Allow admin users to upload donation proof images
CREATE POLICY "Admin can upload donation proofs"
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

-- Allow admin users to delete donation proof images
CREATE POLICY "Admin can delete donation proofs"
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
