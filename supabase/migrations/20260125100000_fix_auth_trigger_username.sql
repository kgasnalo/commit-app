-- Auth Trigger を更新: 新規ユーザー作成時に有効な username を自動生成
-- username 形式: user_XXXXXXXX (13文字、CHECK制約に適合)
--
-- 背景: 20260123100000 マイグレーションで username に NOT NULL 制約と
-- CHECK制約 (^[a-zA-Z0-9_]{3,20}$) を追加したが、Auth Trigger が
-- username を提供しないため AuthApiError が発生していた。

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8),
    'inactive'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーが存在しない場合のみ作成（既存の場合は関数のみ更新済み）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
