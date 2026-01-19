-- Create donations table for quarterly donation reports
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter TEXT NOT NULL, -- e.g., "2026-Q1"
  year INTEGER NOT NULL,
  quarter_number INTEGER NOT NULL CHECK (quarter_number BETWEEN 1 AND 4),
  amount INTEGER NOT NULL, -- Amount in JPY
  currency TEXT NOT NULL DEFAULT 'JPY',
  recipient_name TEXT NOT NULL DEFAULT 'Room to Read',
  recipient_url TEXT DEFAULT 'https://www.roomtoread.org/',
  proof_image_url TEXT, -- URL to proof image in Storage
  description TEXT, -- Optional description
  donated_at TIMESTAMPTZ NOT NULL, -- When the donation was made
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_donations_quarter ON donations(year DESC, quarter_number DESC);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read donations (public info)
CREATE POLICY "Anyone can read donations"
  ON donations FOR SELECT
  TO authenticated
  USING (true);

-- Also allow public/anon to read (for web portal without auth)
CREATE POLICY "Public can read donations"
  ON donations FOR SELECT
  TO anon
  USING (true);

-- Only service role can insert/update/delete (admin only)
-- No policies for INSERT/UPDATE/DELETE means only service_role can modify

-- Create storage bucket for donation proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-proofs', 'donation-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to donation proofs
CREATE POLICY "Public can view donation proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'donation-proofs');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_donations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donations_updated_at();

-- Add comment
COMMENT ON TABLE donations IS 'Quarterly donation reports to Room to Read';
