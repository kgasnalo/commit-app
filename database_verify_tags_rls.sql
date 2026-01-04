-- Phase 8 Additional Fix: Verify and fix tags RLS policies
-- Execute this SQL in Supabase SQL Editor

-- 1. Check if tables exist
SELECT
    table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'tags'
    ) as tags_exists,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'book_tags'
    ) as book_tags_exists;

-- 2. Check current RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tags', 'book_tags')
ORDER BY tablename, cmd;

-- 3. If tables don't exist, create them (should have been created by database_migration_phase8.sql)
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.book_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID REFERENCES public.commitments(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(commitment_id, tag_id)
);

-- 4. Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;

DROP POLICY IF EXISTS "Users can view own book_tags" ON public.book_tags;
DROP POLICY IF EXISTS "Users can insert own book_tags" ON public.book_tags;
DROP POLICY IF EXISTS "Users can delete own book_tags" ON public.book_tags;
DROP POLICY IF EXISTS "Users can update own book_tags" ON public.book_tags;

-- 6. Create comprehensive RLS policies for tags
CREATE POLICY "Users can view own tags"
  ON public.tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tags"
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tags"
  ON public.tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 7. Create comprehensive RLS policies for book_tags
CREATE POLICY "Users can view own book_tags"
  ON public.book_tags
  FOR SELECT
  TO authenticated
  USING (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own book_tags"
  ON public.book_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own book_tags"
  ON public.book_tags
  FOR UPDATE
  TO authenticated
  USING (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own book_tags"
  ON public.book_tags
  FOR DELETE
  TO authenticated
  USING (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

-- 8. Verify the policies were created successfully
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('tags', 'book_tags')
ORDER BY tablename, cmd;

-- 9. Test queries to verify RLS is working (these should succeed for authenticated users)
-- Uncomment and run after authentication in your app:
/*
-- Test SELECT on tags
SELECT COUNT(*) FROM public.tags;

-- Test INSERT on tags
INSERT INTO public.tags (user_id, name, color)
VALUES (auth.uid(), 'Test Tag', '#FF0000');

-- Test SELECT on book_tags
SELECT COUNT(*) FROM public.book_tags;
*/
