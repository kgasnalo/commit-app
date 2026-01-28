---
name: save-knowledge
description: |
  SNS投稿や記事からナレッジを抽出し、Memory MCPに自動分類して保存する。
  以下の場合に使用:
  - Xの有益な投稿を保存したい時
  - 技術記事のポイントを記録したい時
  - マーケティングTipsを蓄積したい時
---

# Knowledge Save & Categorize

## 手順

### Step 1: 入力判定と内容取得

入力がURLかテキストかを判定:

**URLの場合:**
1. WebFetchツールで内容を取得
2. 取得した内容から要点を抽出

**テキストの場合:**
1. そのまま解析に進む

### Step 2: 内容解析

取得した内容から以下を抽出:
- 主要な学び・ポイント（箇条書き3-5個）
- ソース情報（URL、著者名）
- 関連キーワード

### Step 3: カテゴリ自動判定

以下のルールで分類:

| カテゴリ | 判定キーワード |
|----------|----------------|
| **Tech** | コード、API、バグ、実装、DB、インフラ、TypeScript、アーキテクチャ |
| **Marketing** | 広告、SNS、コンバージョン、LTV、CAC、ファネル |
| **Growth** | PMF、リテンション、アクティベーション、グロース、指標 |
| **Design** | UI、UX、デザインシステム、Figma、プロトタイプ |
| **Product** | 機能設計、ロードマップ、優先度、MVP、スコープ |

複数該当する場合は最も関連性の高いものを選択。

### Step 4: Memory MCP保存

```
mcp__memory__create_entities({
  entities: [{
    name: "Knowledge_[YYYYMMDD]_[短縮タイトル]",
    entityType: "[判定カテゴリ]",
    observations: [
      "要点1: ...",
      "要点2: ...",
      "要点3: ...",
      "ソース: X/@username or URL",
      "日付: YYYY-MM-DD",
      "タグ: #keyword1 #keyword2 #keyword3"
    ]
  }]
})
```

### Step 5: 関連ナレッジ検索・リンク

1. `mcp__memory__search_nodes` で関連キーワード検索
2. 関連があれば `mcp__memory__create_relations` でリンク
   - relationType: `relates_to`, `extends`, `contradicts`

### Step 6: 完了報告

保存した内容のサマリーを表示:
- カテゴリ
- 抽出した要点
- 関連付けたナレッジ（あれば）

## 使用例

**入力:**
```
このツイートをナレッジ化して:
「スタートアップのマーケティングで最も大事なのは、
最初の100人のユーザーを手動で獲得すること。
スケールしないことをやれ。」
- @paulg
```

**出力:**
```
ナレッジ保存完了

カテゴリ: Growth
名前: Knowledge_20260126_DoThingsThatDontScale

要点:
- 最初の100人は手動獲得が重要
- スケールしない施策を恐れない
- Paul Graham の YC 哲学

タグ: #startup #growth #early-stage
関連: Knowledge_20260120_PMF戦略 (relates_to)
```

## 成功条件

- Memory MCPにエンティティが作成されている
- 適切なカテゴリに分類されている
- 要点が3-5個抽出されている
