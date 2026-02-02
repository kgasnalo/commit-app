# /save-knowledge

SNS投稿や記事からナレッジを抽出し、Memory MCPに自動分類して保存する。

## 使用方法

```
/save-knowledge [--type <type>] [--url <url>] [--content <text>]
```

## パラメータ

| パラメータ | 説明 | 必須 |
|-----------|------|------|
| `--type` | ナレッジタイプ (auto/x-post/marketing/tech/growth/competitor) | No (default: auto) |
| `--url` | X投稿や記事のURL | No |
| `--content` | 直接テキスト入力 | No |

## ナレッジタイプ

### XPostKnowledge (x-post)
バズった投稿パターンの分析

保存項目:
- フック（最初の1行）
- フォーマット（箇条書き/物語/質問形式）
- エンゲージメント要因の推定
- 応用可能なテンプレート化
- 投稿時間帯

### MarketingTip (marketing)
マーケティングの知見・Tips

保存項目:
- 要点（箇条書き）
- 適用可能なシーン
- 実行可能なアクション

### TechKnowledge (tech)
技術的な知見・ベストプラクティス

保存項目:
- 技術領域
- 要点（箇条書き）
- コード例（あれば）
- 参考リンク

### Growth (growth)
成長戦略・グロースハック

保存項目:
- 戦略のカテゴリ
- 要点
- 成功事例
- 適用条件

### CompetitorInsight (competitor)
競合分析

保存項目:
- 競合名
- 戦略の特徴
- 学べるポイント
- 差別化のヒント

### EffectiveHook (hook)
効果的なフック・コピー

保存項目:
- フックテキスト
- パターン分類（数字/疑問形/対比/ストーリー）
- 適用可能なコンテキスト

## 実行手順

### 1. X投稿を保存
```
/save-knowledge --type x-post --url https://x.com/example/status/123456
```

Claude will:
1. WebFetchでツイート内容を取得
2. フック、フォーマット、エンゲージメント要因を分析
3. Memory MCPに保存

### 2. 記事のナレッジを保存
```
/save-knowledge --url https://example.com/article
```

Claude will:
1. WebFetchで記事内容を取得
2. 内容から自動でタイプを判定 (auto)
3. 要点を抽出してMemory MCPに保存

### 3. 直接テキストを保存
```
/save-knowledge --type marketing --content "ユーザーのペインポイントを..."
```

## Memory MCP エンティティ構造

### XPostKnowledge
```json
{
  "name": "XPost_{date}_{topic}",
  "entityType": "XPostKnowledge",
  "observations": [
    "フック: [最初の1行]",
    "フォーマット: [箇条書き/物語/質問形式/対比/数字]",
    "エンゲージメント要因: [...]",
    "テンプレート化: [汎用的なパターン]",
    "投稿時間帯: [JST/PST]",
    "ソース: [URL]",
    "日付: [YYYY-MM-DD]"
  ]
}
```

### EffectiveHook
```json
{
  "name": "Hook_{pattern}_{date}",
  "entityType": "EffectiveHook",
  "observations": [
    "フック: [テキスト]",
    "パターン: [数字/疑問形/対比/ストーリー/共感]",
    "効果的な理由: [...]",
    "適用可能なコンテキスト: [...]",
    "ソース: [URL]",
    "日付: [YYYY-MM-DD]"
  ]
}
```

### CompetitorInsight
```json
{
  "name": "Competitor_{name}_{date}",
  "entityType": "CompetitorInsight",
  "observations": [
    "競合名: [...]",
    "戦略の特徴: [...]",
    "学べるポイント: [...]",
    "差別化のヒント: [...]",
    "ソース: [URL]",
    "日付: [YYYY-MM-DD]"
  ]
}
```

## 検索と活用

### ナレッジの検索
```
mcp__memory__search_nodes("XPostKnowledge")
mcp__memory__search_nodes("数字フック")
mcp__memory__search_nodes("競合 フリーミアム")
```

### 投稿作成時の参照
1. `/generate-x-post` 実行前にナレッジを検索
2. 効果的なパターンを参考にコンテンツ生成
3. テンプレート改善に活用

## 使用例

### バズったツイートの保存
```
/save-knowledge --type x-post --url https://x.com/levelsio/status/...
```

出力:
```
✅ ナレッジを保存しました

タイプ: XPostKnowledge
名前: XPost_20260202_indiehacker
---
フック: "I made $2.7M in revenue last year. Here's what worked:"
フォーマット: 数字リスト + before/after
エンゲージメント要因:
  - 具体的な数字で信頼性
  - 短いリスト形式で読みやすい
  - 各ポイントが実行可能
テンプレート化:
  "I [achieved X]. Here's what worked:
   1. [action + result]
   2. [action + result]
   3. [action + result]"
```

### 効果的なフックの保存
```
/save-knowledge --type hook --content "読書家の9割が間違えている「積読」の本当の原因"
```

出力:
```
✅ フックを保存しました

タイプ: EffectiveHook
パターン: 数字 + 常識への反論
効果的な理由:
  - 9割という数字で多数派を否定
  - 「本当の原因」で新情報を示唆
  - 読書家をターゲットに絞り込み
```

## 関連スキル

- `/generate-x-post` - 投稿生成（ナレッジを参照可能）
- `/manage-x-queue` - キュー管理
- `/analyze-x-performance` - パフォーマンス分析

## 自動トリガー

以下の場合、スキルの使用を提案します:
- 有益なX投稿を見つけた時
- 競合のマーケティング施策を発見した時
- 技術記事のポイントを記録したい時
- 効果的なコピーを見つけた時
