-- Phase 4: データベーススキーマ更新
-- 実行日: 2025年12月26日

-- 1. commitmentsテーブルにcurrency列を追加
ALTER TABLE public.commitments
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JPY';

-- 2. pledge_amountの型をINTEGERからNUMERICに変更（小数対応）
-- 既存のデータを保持しながら型を変更
ALTER TABLE public.commitments
ALTER COLUMN pledge_amount TYPE NUMERIC(10,2) USING pledge_amount::numeric;

-- 3. コメント追加
COMMENT ON COLUMN public.commitments.currency IS 'ペナルティの通貨コード (JPY, USD, EUR, etc.)';
COMMENT ON COLUMN public.commitments.pledge_amount IS 'ペナルティ金額（小数点以下2桁まで対応）';

-- 確認用クエリ
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'commitments'
  AND column_name IN ('currency', 'pledge_amount');
