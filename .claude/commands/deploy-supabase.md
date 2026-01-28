---
name: deploy-supabase
description: |
  Supabase migrations と Edge Functions を本番環境にデプロイする。
  以下の場合に使用:
  - DBスキーマ変更後
  - Edge Function追加/修正後
  - リリース時のデプロイ
---

# Supabase Deploy

## 手順

1. マイグレーション状態確認
```bash
supabase migration list
```

2. マイグレーション適用
```bash
supabase db push
```

3. Edge Functions デプロイ
```bash
for func in admin-actions create-commitment delete-account isbn-lookup process-expired-commitments send-push-notification use-lifeline job-recommendations; do
  supabase functions deploy $func --no-verify-jwt
done
```

4. 結果を報告

## トラブルシューティング

### Migration version mismatch
```bash
supabase migration repair --status reverted <version>
supabase db push
```

### Edge Function deploy 失敗
- `--no-verify-jwt` フラグを確認
- `supabase secrets list` で環境変数確認

## CLAUDE.mdルール

- Migration file命名: `YYYYMMDDHHMMSS_description.sql`
- UUID生成: `gen_random_uuid()` を使用（`uuid_generate_v4()` はNG）
- Edge Function: `req.json()` は必ず try-catch で囲む
- 環境変数: 空チェック必須

## 成功条件

- `supabase migration list` で Local と Remote が一致
- 全Edge Functionが正常にデプロイ完了
