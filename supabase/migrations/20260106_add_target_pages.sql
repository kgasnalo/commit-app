-- Add target_pages column to commitments table
-- This column stores the page count goal for each commitment

ALTER TABLE commitments
ADD COLUMN IF NOT EXISTS target_pages INTEGER DEFAULT 100;

-- Add comment for documentation
COMMENT ON COLUMN commitments.target_pages IS 'Target number of pages to read for this commitment';
