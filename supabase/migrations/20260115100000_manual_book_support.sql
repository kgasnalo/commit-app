-- Migration: Manual Book Support
-- Allows users to add books manually when Google Books search fails

-- 1. Make google_books_id nullable for manual entries
ALTER TABLE books
  ALTER COLUMN google_books_id DROP NOT NULL;

-- 2. Add total_pages column for manual books (used as slider max)
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS total_pages INTEGER NULL;

-- 3. Add is_manual flag for easy filtering
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE NOT NULL;

-- 4. Drop existing unique constraint on google_books_id
ALTER TABLE books
  DROP CONSTRAINT IF EXISTS books_google_books_id_key;

-- 5. Create partial unique index that allows NULL values
-- This ensures Google Books IDs remain unique while allowing NULL for manual entries
CREATE UNIQUE INDEX IF NOT EXISTS books_google_books_id_unique
  ON books(google_books_id)
  WHERE google_books_id IS NOT NULL;

-- 6. Add index for filtering manual books
CREATE INDEX IF NOT EXISTS idx_books_is_manual
  ON books(is_manual);

-- 7. Add comment for documentation
COMMENT ON COLUMN books.total_pages IS 'Total page count for manual entries, used as commitment slider max';
COMMENT ON COLUMN books.is_manual IS 'True if book was manually added by user (not from Google Books)';
