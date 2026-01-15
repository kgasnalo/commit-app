-- Enable public uploads for the book-covers bucket to support onboarding flow
-- This allows unauthenticated users to upload cover images before account creation

BEGIN;

-- Drop the existing restrictive policy if it exists (to avoid confusion/overlap, though technically we could just add a new one)
-- However, 'authenticated' is a subset of 'public' in some contexts, but in Supabase/Postgres RLS, 'public' role means "everyone including anon".
-- It's often cleaner to have specific policies. 
-- Let's just ADD the public policy. 'authenticated' users will fall under 'public' or match their specific policy.
-- Actually, for simplicity and clarity, we'll add a specific policy for public uploads.

CREATE POLICY "Allow public uploads for book covers"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'book-covers');

COMMIT;
