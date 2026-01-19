-- Fix donated_at column: make it nullable or set default from transfer_date
-- The code sends transfer_date but not donated_at

-- Option 1: Make donated_at nullable (simplest)
ALTER TABLE donations ALTER COLUMN donated_at DROP NOT NULL;

-- Option 2: Create a trigger to auto-populate donated_at from transfer_date
CREATE OR REPLACE FUNCTION set_donated_at_from_transfer_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.donated_at IS NULL AND NEW.transfer_date IS NOT NULL THEN
    NEW.donated_at = NEW.transfer_date::timestamptz;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donations_set_donated_at
  BEFORE INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION set_donated_at_from_transfer_date();
