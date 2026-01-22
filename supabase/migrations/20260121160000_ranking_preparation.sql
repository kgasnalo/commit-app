-- ============================================================================
-- ランキング機能の前準備マイグレーション
-- 週間/月間読破数ランキングに必要なカラムとインデックスを追加
-- ============================================================================

-- 1. commitments テーブルに completed_at カラム追加
-- status = 'completed' になった正確な日時を記録（ランキング集計用）
ALTER TABLE commitments
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. 既存の completed レコードに updated_at の値をコピー
-- 過去のデータもランキングに反映できるようにする
UPDATE commitments
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;

-- 3. users テーブルに show_in_ranking カラム追加
-- デフォルト true（オプトアウト方式）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS show_in_ranking BOOLEAN DEFAULT true;

-- 4. ランキングクエリ用インデックス
-- 週間/月間の completed レコードを効率的に取得するため
CREATE INDEX IF NOT EXISTS idx_commitments_completed_at
ON commitments(completed_at DESC)
WHERE status = 'completed';

-- ユーザー別の completed レコード取得用
CREATE INDEX IF NOT EXISTS idx_commitments_user_completed
ON commitments(user_id, status, completed_at DESC);

-- ============================================================================
-- コメント追加（ドキュメント目的）
-- ============================================================================
COMMENT ON COLUMN commitments.completed_at IS 'コミットメント完了日時（ランキング集計用）';
COMMENT ON COLUMN users.show_in_ranking IS 'ランキングに表示するかどうか（デフォルト: true）';
