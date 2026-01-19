-- Add RLS policies for admin to manage announcements
-- Admin users have role = 'Founder' in users table

-- Allow admin users to insert announcements
CREATE POLICY "Admin can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Allow admin users to update announcements
CREATE POLICY "Admin can update announcements"
  ON announcements FOR UPDATE
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

-- Allow admin users to delete announcements
CREATE POLICY "Admin can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Also allow admin to read all announcements (including drafts)
CREATE POLICY "Admin can read all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );
