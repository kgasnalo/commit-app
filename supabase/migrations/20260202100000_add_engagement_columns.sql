-- X投稿エンゲージメントデータ用カラム追加
-- scheduled_postsテーブルにパフォーマンス分析用のカラムを追加

-- ============================================
-- エンゲージメントカラム追加
-- ============================================
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retweets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS replies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_fetched_at TIMESTAMPTZ;

-- エンゲージメント率計算用の生成カラム（impressions > 0の場合のみ）
-- engagement_rate = (likes + retweets + replies + quotes) / impressions * 100
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN impressions > 0
    THEN ROUND(((likes + retweets + replies + quotes)::NUMERIC / impressions) * 100, 2)
    ELSE 0
  END
) STORED;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_engagement ON scheduled_posts(engagement_rate)
  WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_posted_at ON scheduled_posts(posted_at)
  WHERE status = 'posted';

-- ============================================
-- A/Bテストテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  variant_a_template_id UUID REFERENCES post_templates(id),
  variant_b_template_id UUID REFERENCES post_templates(id),
  variant_a_post_id UUID REFERENCES scheduled_posts(id),
  variant_b_post_id UUID REFERENCES scheduled_posts(id),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'cancelled')) DEFAULT 'pending',
  winner TEXT CHECK (winner IN ('A', 'B', 'TIE', NULL)),
  winner_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);

-- RLS有効化
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

-- Founderのみアクセス可能
CREATE POLICY "Founder can read ab_tests"
  ON ab_tests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Founder'
    )
  );

CREATE POLICY "Founder can modify ab_tests"
  ON ab_tests FOR ALL
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
-- updated_at トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_ab_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_tests_updated_at();

-- ============================================
-- post_generation_logs にアクション追加
-- ============================================
ALTER TABLE post_generation_logs
DROP CONSTRAINT IF EXISTS post_generation_logs_action_check;

ALTER TABLE post_generation_logs
ADD CONSTRAINT post_generation_logs_action_check
CHECK (action IN (
  'generation_started',
  'generation_completed',
  'image_generation_started',
  'image_generation_completed',
  'image_generation_failed',
  'post_started',
  'post_completed',
  'post_failed',
  'retry_scheduled',
  'engagement_fetched',
  'ab_test_started',
  'ab_test_completed'
));

COMMENT ON TABLE ab_tests IS 'A/Bテスト管理テーブル - テンプレート比較用';
COMMENT ON COLUMN scheduled_posts.impressions IS 'X API: インプレッション数';
COMMENT ON COLUMN scheduled_posts.likes IS 'X API: いいね数';
COMMENT ON COLUMN scheduled_posts.retweets IS 'X API: リツイート数';
COMMENT ON COLUMN scheduled_posts.replies IS 'X API: リプライ数';
COMMENT ON COLUMN scheduled_posts.quotes IS 'X API: 引用ツイート数';
COMMENT ON COLUMN scheduled_posts.engagement_rate IS '計算カラム: (likes+retweets+replies+quotes)/impressions*100';
