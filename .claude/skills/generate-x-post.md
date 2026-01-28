# /generate-x-post

手動でX投稿を生成し、スケジュールするスキル。

## 使用方法

```
/generate-x-post [--language en|ja] [--template <name>] [--count <n>] [--dry-run]
```

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|-----------|
| `--language` | 投稿言語 (en/ja) | en |
| `--template` | テンプレート名 (指定しない場合は自動選択) | - |
| `--count` | 生成する投稿数 (1-10) | 1 |
| `--dry-run` | プレビューのみ (DBに保存しない) | false |

## 利用可能なテンプレート

### Build in Public
- `origin_story` - 創業ストーリー
- `tech_stack` - 技術スタック紹介
- `milestone_update` - マイルストーン報告

### Problem/Solution
- `problem_awareness` - 問題提起
- `before_after` - Before/After比較
- `pain_point` - ペインポイント共感

### Visual
- `feature_deep_dive` - 機能詳細 (スクショ必要)
- `hall_of_fame` - 殿堂入り紹介 (スクショ必要)
- `ui_showcase` - UI紹介 (スクショ必要)

### Engagement
- `question_hook` - 質問形式
- `poll_style` - アンケート風
- `controversial_take` - 議論を呼ぶ意見

### Micro
- `daily_stat` - デイリー統計
- `quick_tip` - クイックTips
- `feature_teaser` - 機能予告
- `gratitude` - 感謝
- `shipping_update` - リリース報告

## 実行手順

1. **dry-run でプレビュー**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language":"en","dry_run":true}' \
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/generate-x-posts
```

2. **本番生成**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language":"en","count":3}' \
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/generate-x-posts
```

3. **特定テンプレートで生成**
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language":"ja","template_name":"origin_story"}' \
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/generate-x-posts
```

## 注意事項

- `media_type='ai_image'` の投稿は `pending` 状態で作成され、画像生成ジョブが別途実行される
- `media_type='screenshot'` の投稿は手動でスクリーンショットをアップロードする必要がある
- 投稿はスケジュール時刻に達すると自動的に投稿される

## 関連スキル

- `/manage-x-queue` - キュー管理
