# /analyze-x-performance

X投稿のパフォーマンスを分析し、改善提案を生成するスキル。

## 使用方法

```
/analyze-x-performance [--days <n>] [--report weekly|template|time|full]
```

## パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|-----------|
| `--days` | 分析対象期間（日数） | 30 |
| `--report` | レポートタイプ | full |

## レポートタイプ

### weekly - 週次サマリー
- 総インプレッション/エンゲージメント
- ベスト投稿TOP3
- ワースト投稿TOP3
- 前週比較

### template - テンプレート別分析
- テンプレート別エンゲージメント率
- 最高パフォーマンステンプレート
- 改善が必要なテンプレート
- 使用頻度と効果の相関

### time - 時間帯分析
- 時間帯別エンゲージメント率
- 曜日別パフォーマンス
- 最適投稿時間の推奨

### full - 全体レポート
上記すべてを含む包括的な分析

## 実行手順

### 1. 週次レポート取得
```sql
-- 過去7日間の投稿サマリー
SELECT
  COUNT(*) AS total_posts,
  SUM(impressions) AS total_impressions,
  SUM(likes) AS total_likes,
  SUM(retweets) AS total_retweets,
  ROUND(AVG(engagement_rate), 2) AS avg_engagement_rate
FROM scheduled_posts
WHERE status = 'posted'
  AND posted_at > NOW() - INTERVAL '7 days';

-- ベスト投稿TOP3
SELECT
  id,
  LEFT(content_en, 80) AS content_preview,
  impressions,
  likes,
  retweets,
  engagement_rate,
  posted_at
FROM scheduled_posts
WHERE status = 'posted'
  AND posted_at > NOW() - INTERVAL '7 days'
ORDER BY engagement_rate DESC NULLS LAST
LIMIT 3;

-- ワースト投稿TOP3
SELECT
  id,
  LEFT(content_en, 80) AS content_preview,
  impressions,
  likes,
  retweets,
  engagement_rate,
  posted_at
FROM scheduled_posts
WHERE status = 'posted'
  AND posted_at > NOW() - INTERVAL '7 days'
  AND impressions > 0
ORDER BY engagement_rate ASC
LIMIT 3;
```

### 2. テンプレート別分析
```sql
-- テンプレート別パフォーマンス
SELECT
  pt.name AS template_name,
  pt.category,
  COUNT(sp.id) AS post_count,
  ROUND(AVG(sp.engagement_rate), 2) AS avg_engagement_rate,
  SUM(sp.impressions) AS total_impressions,
  SUM(sp.likes) AS total_likes
FROM post_templates pt
LEFT JOIN scheduled_posts sp ON sp.template_id = pt.id
  AND sp.status = 'posted'
  AND sp.posted_at > NOW() - INTERVAL '30 days'
WHERE pt.is_active = true
GROUP BY pt.id, pt.name, pt.category
ORDER BY avg_engagement_rate DESC NULLS LAST;

-- カテゴリ別パフォーマンス
SELECT
  pt.category,
  COUNT(sp.id) AS post_count,
  ROUND(AVG(sp.engagement_rate), 2) AS avg_engagement_rate
FROM post_templates pt
JOIN scheduled_posts sp ON sp.template_id = pt.id
WHERE sp.status = 'posted'
  AND sp.posted_at > NOW() - INTERVAL '30 days'
GROUP BY pt.category
ORDER BY avg_engagement_rate DESC;
```

### 3. 時間帯分析
```sql
-- 時間帯別パフォーマンス（JST）
SELECT
  EXTRACT(HOUR FROM posted_at AT TIME ZONE 'Asia/Tokyo') AS hour_jst,
  COUNT(*) AS post_count,
  ROUND(AVG(engagement_rate), 2) AS avg_engagement_rate,
  ROUND(AVG(impressions), 0) AS avg_impressions
FROM scheduled_posts
WHERE status = 'posted'
  AND posted_at > NOW() - INTERVAL '30 days'
GROUP BY hour_jst
ORDER BY avg_engagement_rate DESC NULLS LAST;

-- 曜日別パフォーマンス
SELECT
  TO_CHAR(posted_at, 'Day') AS day_of_week,
  EXTRACT(DOW FROM posted_at) AS dow_num,
  COUNT(*) AS post_count,
  ROUND(AVG(engagement_rate), 2) AS avg_engagement_rate
FROM scheduled_posts
WHERE status = 'posted'
  AND posted_at > NOW() - INTERVAL '30 days'
GROUP BY day_of_week, dow_num
ORDER BY dow_num;
```

### 4. A/Bテスト結果
```sql
-- 完了したA/Bテスト
SELECT
  ab.name,
  ab.winner,
  ab.winner_reason,
  pt_a.name AS template_a,
  pt_b.name AS template_b,
  sp_a.engagement_rate AS rate_a,
  sp_b.engagement_rate AS rate_b,
  ab.end_date
FROM ab_tests ab
LEFT JOIN post_templates pt_a ON ab.variant_a_template_id = pt_a.id
LEFT JOIN post_templates pt_b ON ab.variant_b_template_id = pt_b.id
LEFT JOIN scheduled_posts sp_a ON ab.variant_a_post_id = sp_a.id
LEFT JOIN scheduled_posts sp_b ON ab.variant_b_post_id = sp_b.id
WHERE ab.status = 'completed'
ORDER BY ab.end_date DESC
LIMIT 5;
```

## 出力フォーマット

### 週次レポート例

```
📊 X投稿パフォーマンスレポート (過去7日間)
============================================

【サマリー】
総投稿数: 14
総インプレッション: 12,450
総いいね: 234
総RT: 45
平均エンゲージメント率: 2.24%

【ベストパフォーマンス TOP3】
1. 🥇 "読書家の9割が間違えている..." (ER: 4.2%)
   - 1,200 impressions | 32 likes | 8 RT
   - テンプレート: controversial_take

2. 🥈 "I built Commit because..." (ER: 3.8%)
   - 980 impressions | 28 likes | 6 RT
   - テンプレート: origin_story

3. 🥉 "Monk Mode in Commit..." (ER: 3.1%)
   - 850 impressions | 18 likes | 4 RT
   - テンプレート: feature_deep_dive

【改善が必要な投稿】
1. "Daily stat: 50 users..." (ER: 0.5%)
   - 改善案: 数字を文脈と共に提示する

【推奨アクション】
- controversial_take テンプレートの使用頻度を上げる
- daily_stat テンプレートは内容を見直す
- 投稿時間を21:00 JSTに寄せる（最高ER時間帯）
```

## 改善提案ロジック

1. **テンプレート効果分析**
   - 平均ERが全体平均の150%以上 → 使用頻度UP推奨
   - 平均ERが全体平均の50%以下 → 改善or停止検討

2. **時間帯最適化**
   - 過去30日の時間帯別ERから最適時間を算出
   - 現在の投稿スケジュールとのギャップを指摘

3. **コンテンツパターン分析**
   - 高ER投稿のフック分析 → Memory MCPに保存
   - 低ER投稿の共通点抽出 → 改善ポイント提示

## 自動実行（週次レポート）

Edge Function `weekly-x-report` で毎週月曜 9:00 JST に自動生成:
- Slack/Discord通知（Webhook設定時）
- またはメール送信

## 関連スキル

- `/generate-x-post` - 投稿生成（改善提案を反映）
- `/manage-x-queue` - キュー管理
- `/save-knowledge` - 高パフォーマンス投稿のパターン保存

## 使用例

```bash
# 週次レポート
/analyze-x-performance --report weekly

# テンプレート効果分析（過去60日）
/analyze-x-performance --days 60 --report template

# 最適投稿時間分析
/analyze-x-performance --report time

# フルレポート
/analyze-x-performance
```
