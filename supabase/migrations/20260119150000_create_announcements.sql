-- Create announcements table for admin notices
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'update', 'maintenance', 'important')),
  published_at TIMESTAMPTZ,  -- NULL means draft
  expires_at TIMESTAMPTZ,    -- Optional: auto-hide after this time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying of published announcements
CREATE INDEX idx_announcements_published_at ON announcements(published_at) WHERE published_at IS NOT NULL;

-- RLS policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read published announcements
CREATE POLICY "Anyone can read published announcements"
ON announcements FOR SELECT
USING (
  published_at IS NOT NULL
  AND published_at <= NOW()
  AND (expires_at IS NULL OR expires_at > NOW())
);

-- Only authenticated admins can insert (handled by Edge Functions with service_role key)
-- For now, we allow admin dashboard operations via service_role key bypass

-- Add description field to donations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'description'
  ) THEN
    ALTER TABLE donations ADD COLUMN description TEXT;
  END IF;
END $$;
