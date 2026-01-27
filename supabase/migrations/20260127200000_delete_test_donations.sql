-- Delete test donation records created during development
-- The donations table is public-facing (quarterly charity reports),
-- so test data must be removed before production release.
DELETE FROM donations;
