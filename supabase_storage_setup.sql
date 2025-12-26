-- Phase 4: Supabase Storage設定
-- 実行日: 2025年12月26日

-- 注意: ストレージバケットの作成はSupabaseダッシュボードで行う必要があります
-- Storage → Create new bucket
-- Name: verifications
-- Public: ON

-- 1. verificationsバケットのRLSポリシー追加

-- 認証済みユーザーが検証画像をアップロードできるポリシー
CREATE POLICY "Authenticated users can upload verification images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verifications');

-- 誰でも検証画像を閲覧できるポリシー
CREATE POLICY "Anyone can view verification images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'verifications');

-- 自分がアップロードした画像のみ削除できるポリシー（オプション）
CREATE POLICY "Users can delete their own verification images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'verifications' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 確認用クエリ
SELECT *
FROM storage.buckets
WHERE name = 'verifications';

SELECT *
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%verification%';
