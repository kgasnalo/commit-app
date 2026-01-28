-- Create tags and book_tags tables (Phase 8 Library Feature)
-- Note: Tables may already exist from manual SQL execution

-- タグテーブル
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 本とタグの中間テーブル
CREATE TABLE IF NOT EXISTS public.book_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID REFERENCES public.commitments(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(commitment_id, tag_id)
);

-- RLSを有効化
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

-- ポリシー (DROP IF EXISTS + CREATE で冪等に)
DO $$
BEGIN
  -- tags policies
  DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
  DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
  DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
  DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;

  -- book_tags policies
  DROP POLICY IF EXISTS "Users can view own book_tags" ON public.book_tags;
  DROP POLICY IF EXISTS "Users can insert own book_tags" ON public.book_tags;
  DROP POLICY IF EXISTS "Users can delete own book_tags" ON public.book_tags;
END $$;

CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own book_tags" ON public.book_tags
  FOR SELECT TO authenticated
  USING (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own book_tags" ON public.book_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own book_tags" ON public.book_tags
  FOR DELETE TO authenticated
  USING (
    commitment_id IN (
      SELECT id FROM public.commitments WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag_id ON book_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_commitment_id ON book_tags(commitment_id);
