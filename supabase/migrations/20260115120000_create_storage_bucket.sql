-- Create book-covers storage bucket for manual book cover uploads
-- This bucket is public for reading, authenticated users can upload

-- Create the bucket (public for reading cover images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,  -- Public bucket (anyone can read)
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view/download cover images (public bucket)
CREATE POLICY "Public read access for book covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'book-covers');

-- Policy: Authenticated users can upload cover images
CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-covers');

-- Policy: Users can update their own uploaded covers
CREATE POLICY "Users can update own book covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'book-covers');

-- Policy: Users can delete their own uploaded covers
CREATE POLICY "Users can delete own book covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
