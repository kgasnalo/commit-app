-- X自動投稿システム用テーブル
-- scheduled_posts: 投稿キュー
-- post_templates: マーケテンプレート
-- post_generation_logs: デバッグ・分析用ログ

-- ============================================
-- scheduled_posts: 投稿キュー
-- ============================================
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_en TEXT NOT NULL,
  content_ja TEXT,
  hashtags TEXT[] DEFAULT '{}',
  media_type TEXT CHECK (media_type IN ('screenshot', 'ai_image', 'video', 'none')),
  media_url TEXT,
  media_prompt TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'ja')) DEFAULT 'en',
  status TEXT NOT NULL CHECK (status IN ('pending', 'generating_image', 'ready', 'processing', 'posted', 'failed')) DEFAULT 'pending',
  posted_at TIMESTAMPTZ,
  x_post_id TEXT,
  template_id UUID,
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_language ON scheduled_posts(language);
CREATE INDEX idx_scheduled_posts_status_scheduled ON scheduled_posts(status, scheduled_at)
  WHERE status IN ('pending', 'ready');

-- RLS有効化 (管理者専用テーブル)
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Founderのみ読み取り可能
CREATE POLICY "Founder can read scheduled_posts"
  ON scheduled_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- Edge Functions (service_role) は全操作可能
-- ※ service_role は RLS をバイパスするため明示的なポリシー不要

-- ============================================
-- post_templates: マーケテンプレート
-- ============================================
CREATE TABLE post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('build_in_public', 'problem_solution', 'visual', 'engagement', 'micro')),
  template_en TEXT NOT NULL,
  template_ja TEXT,
  hashtags TEXT[] DEFAULT '{}',
  media_required BOOLEAN DEFAULT false,
  media_type TEXT CHECK (media_type IN ('screenshot', 'ai_image', 'video', 'none')),
  image_prompt_hint TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_post_templates_category ON post_templates(category);
CREATE INDEX idx_post_templates_active ON post_templates(is_active) WHERE is_active = true;

-- RLS有効化
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;

-- 全ユーザー読み取り可能 (テンプレートは公開情報)
CREATE POLICY "Anyone can read post_templates"
  ON post_templates FOR SELECT
  TO authenticated
  USING (true);

-- Founderのみ更新可能
CREATE POLICY "Founder can modify post_templates"
  ON post_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- ============================================
-- post_generation_logs: デバッグ・分析用ログ
-- ============================================
CREATE TABLE post_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'generation_started',
    'generation_completed',
    'image_generation_started',
    'image_generation_completed',
    'image_generation_failed',
    'post_started',
    'post_completed',
    'post_failed',
    'retry_scheduled'
  )),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_post_generation_logs_post ON post_generation_logs(scheduled_post_id);
CREATE INDEX idx_post_generation_logs_action ON post_generation_logs(action);
CREATE INDEX idx_post_generation_logs_created ON post_generation_logs(created_at);

-- RLS有効化
ALTER TABLE post_generation_logs ENABLE ROW LEVEL SECURITY;

-- Founderのみアクセス可能
CREATE POLICY "Founder can read post_generation_logs"
  ON post_generation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

-- ============================================
-- updated_at トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_scheduled_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_posts_updated_at();

-- ============================================
-- marketing-assets Storage バケット作成
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-assets',
  'marketing-assets',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: publicバケットなので読み取りは全員可能
CREATE POLICY "Public read for marketing-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'marketing-assets');

-- service_role のみアップロード可能 (Edge Functions経由)
-- ※ service_role は RLS をバイパスするため明示的なポリシー不要

COMMENT ON TABLE scheduled_posts IS 'X自動投稿キュー - Edge Functionsから操作';
COMMENT ON TABLE post_templates IS 'マーケティング投稿テンプレート';
COMMENT ON TABLE post_generation_logs IS '投稿生成・実行ログ';
