# /generate-x-post

手動でX投稿を生成し、スケジュールするスキル。

## 使用方法

```
/generate-x-post [--language en|ja] [--template <name>] [--count <n>] [--dry-run] [--use-knowledge]
```

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|-----------|
| `--language` | 投稿言語 (en/ja) | en |
| `--template` | テンプレート名 (指定しない場合は自動選択) | - |
| `--count` | 生成する投稿数 (1-10) | 1 |
| `--dry-run` | プレビューのみ (DBに保存しない) | false |
| `--use-knowledge` | Memory MCPのナレッジを参照して生成 | false |

## 利用可能なテンプレート

### Build in Public
- `origin_story` - 創業ストーリー
- `tech_stack` - 技術スタック紹介
- `milestone_update` - マイルストーン報告
- `number_hook_journey` - 数字+開発進捗

### Problem/Solution
- `problem_awareness` - 問題提起
- `before_after` - Before/After比較
- `pain_point` - ペインポイント共感
- `story_problem_discovery` - 問題発見ストーリー
- `hybrid_before_after_numbers` - Before/After + 数字

### Visual
- `feature_deep_dive` - 機能詳細 (スクショ必要)
- `hall_of_fame` - 殿堂入り紹介 (スクショ必要)
- `ui_showcase` - UI紹介 (スクショ必要)

### Engagement (高エンゲージメント)
- `question_hook` - 質問形式
- `poll_style` - アンケート風
- `controversial_take` - 議論を呼ぶ意見
- `number_hook_reasons` - 数字フック（理由リスト）
- `number_hook_stats` - 数字フック（統計）
- `contrarian_reading_myth` - 常識への反論（読書神話）
- `contrarian_motivation` - 常識への反論（モチベーション）
- `contrarian_readers` - 常識への反論（読書家）
- `hybrid_question_number` - 質問 + 数字
- `hybrid_story_cta` - ストーリー + CTA

### Story (ストーリー形式)
- `story_founder_journey` - 創業者ジャーニー
- `story_user_win` - ユーザー成功談

### Micro
- `daily_stat` - デイリー統計
- `quick_tip` - クイックTips
- `feature_teaser` - 機能予告
- `gratitude` - 感謝
- `shipping_update` - リリース報告

## 実行手順

### 0. ナレッジを参照して生成（推奨）
```
# Memory MCPから効果的なフック/パターンを検索
mcp__memory__search_nodes("XPostKnowledge")
mcp__memory__search_nodes("EffectiveHook")

# 検索結果を参考にテンプレート選択
```

### 1. dry-run でプレビュー
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language":"en","dry_run":true}' \
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/generate-x-posts
```

### 2. 本番生成
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language":"en","count":3}' \
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/generate-x-posts
```

### 3. 特定テンプレートで生成
```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"language":"ja","template_name":"number_hook_reasons"}' \
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/generate-x-posts
```

## Memory MCPナレッジ活用

投稿生成前にナレッジを検索して、効果的なパターンを参照:

```
# 効果的なフックを検索
mcp__memory__search_nodes("EffectiveHook 数字")

# 過去の成功パターンを検索
mcp__memory__search_nodes("XPostKnowledge エンゲージメント")

# 競合の成功例を参照
mcp__memory__search_nodes("CompetitorInsight マーケティング")
```

## テンプレート選択ガイド

### 高エンゲージメント狙い
1. `number_hook_*` - 数字で注目を集める
2. `contrarian_*` - 常識への反論で議論を呼ぶ
3. `hybrid_question_number` - 質問で回答を促す

### ブランド構築
1. `story_*` - 共感を呼ぶストーリー
2. `origin_story` - 創業者の人間味
3. `gratitude` - コミュニティへの感謝

### 機能訴求
1. `feature_deep_dive` - 詳細な機能紹介
2. `before_after` - 明確な価値訴求
3. `quick_tip` - 実用的なTips

## 注意事項

- `media_type='ai_image'` の投稿は `pending` 状態で作成され、画像生成ジョブが別途実行される
- `media_type='screenshot'` の投稿は手動でスクリーンショットをアップロードする必要がある
- 投稿はスケジュール時刻に達すると自動的に投稿される
- 高パフォーマンス投稿は `/save-knowledge` でパターンを保存する

## パフォーマンス改善サイクル

```
[投稿生成] → [投稿] → [エンゲージメント取得]
     ↑                        ↓
[テンプレート改善] ← [/analyze-x-performance]
     ↑                        ↓
[ナレッジ蓄積] ← [/save-knowledge]
```

## 関連スキル

- `/manage-x-queue` - キュー管理
- `/analyze-x-performance` - パフォーマンス分析
- `/save-knowledge` - 成功パターンの保存
