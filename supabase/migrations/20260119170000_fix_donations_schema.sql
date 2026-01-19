-- Fix donations table schema to match TypeScript types
-- The code expects: quarter (integer), transfer_date (date)
-- The DB has: quarter (text), quarter_number (integer), donated_at (timestamptz)

-- Step 1: Add transfer_date column
ALTER TABLE donations ADD COLUMN IF NOT EXISTS transfer_date DATE;

-- Step 2: Migrate existing data from donated_at to transfer_date
UPDATE donations SET transfer_date = donated_at::date WHERE transfer_date IS NULL;

-- Step 3: Change quarter column from TEXT to INTEGER
-- First, drop the old quarter column and rename quarter_number to quarter
ALTER TABLE donations DROP COLUMN IF EXISTS quarter;
ALTER TABLE donations RENAME COLUMN quarter_number TO quarter;

-- Step 4: Make transfer_date NOT NULL for new rows (after migration)
-- Note: We don't add NOT NULL constraint to avoid breaking existing data without transfer_date
-- The application code should always provide transfer_date

-- Step 5: Drop the old index and create a new one with correct column name
DROP INDEX IF EXISTS idx_donations_quarter;
CREATE INDEX idx_donations_quarter ON donations(year DESC, quarter DESC);

-- Add comment
COMMENT ON COLUMN donations.transfer_date IS 'Date when the donation was transferred (for display purposes)';
COMMENT ON COLUMN donations.quarter IS 'Quarter number (1-4)';
