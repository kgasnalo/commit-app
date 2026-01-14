-- Batch D: Add missing database indexes for query performance
-- Phase P.10 - Improve query performance on frequently accessed tables

-- ============================================
-- commitments table indexes
-- ============================================

-- Index for fetching user's commitments (used by Dashboard, Library)
CREATE INDEX IF NOT EXISTS idx_commitments_user_id
  ON commitments(user_id);

-- Index for book-based queries (used by Continue Flow, Book Detail)
CREATE INDEX IF NOT EXISTS idx_commitments_book_id
  ON commitments(book_id);

-- Index for status filtering (used by Dashboard, History)
CREATE INDEX IF NOT EXISTS idx_commitments_status
  ON commitments(status);

-- Composite index for the most common query pattern:
-- "Get all pending/completed commitments for a user"
CREATE INDEX IF NOT EXISTS idx_commitments_user_status
  ON commitments(user_id, status);

-- ============================================
-- verification_logs table indexes
-- ============================================

-- Index for fetching verification by commitment (used by Celebration, Receipt)
CREATE INDEX IF NOT EXISTS idx_verification_logs_commitment_id
  ON verification_logs(commitment_id);

-- Index for time-based queries (admin/analytics)
CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at
  ON verification_logs(created_at);

-- ============================================
-- tags table indexes
-- ============================================

-- Index for fetching user's tags (used by Library filtering)
CREATE INDEX IF NOT EXISTS idx_tags_user_id
  ON tags(user_id);

-- ============================================
-- book_tags table indexes
-- ============================================

-- Index for tag-based filtering (used by Library tag filter)
CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id
  ON book_tags(tag_id);

-- Index for commitment-based tag lookup
CREATE INDEX IF NOT EXISTS idx_book_tags_commitment_id
  ON book_tags(commitment_id);
