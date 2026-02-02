-- 新しい投稿テンプレート追加
-- 効果が実証されているパターンを追加

-- ============================================================
-- Number Hook テンプレート (数字で始まるフック)
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'number_hook_reasons',
  'engagement',
  '3 reasons why "I''ll read it later" kills your book collection:

1. The pile grows faster than you read
2. Guilt compounds like interest
3. You forget why you bought it

Commit fixes all three. Deadline + stakes = action.',
  '「いつか読む」が積読を増やす3つの理由:

1. 読むより早く積み上がる
2. 罪悪感が複利で増える
3. なぜ買ったか忘れる

Commitはこの3つを解決する。締め切り + ペナルティ = 行動。',
  ARRAY['reading', 'productivity', 'books'],
  false,
  'none',
  NULL
),
(
  'number_hook_stats',
  'engagement',
  '87% of book buyers have at least 5 unread books.

42% have more than 10.

23% have given up counting.

Which group are you in? Commit is for all three.',
  '本を買う人の87%は5冊以上の積読がある。

42%は10冊以上。

23%は数えるのを諦めた。

あなたはどのグループ？Commitは全員のためのアプリ。',
  ARRAY['reading', 'stats', 'tsundoku'],
  false,
  'none',
  NULL
),
(
  'number_hook_journey',
  'build_in_public',
  'Day {days_since_launch} of building Commit.

Revenue: ${revenue}
Users: {active_users}
Books completed: {total_books_completed}

Still here. Still building. Still reading.',
  'Commit開発{days_since_launch}日目。

収益: ¥{revenue_jpy}
ユーザー: {active_users}人
読了数: {total_books_completed}冊

まだここにいる。まだ作ってる。まだ読んでる。',
  ARRAY['buildinpublic', 'indiehacker', 'journey'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Contrarian Take テンプレート (常識への反論)
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'contrarian_reading_myth',
  'engagement',
  'Unpopular opinion: Reading more books won''t make you smarter.

FINISHING more books will.

Starting 10 books = learning nothing.
Finishing 3 books = changing your thinking.

That''s why Commit exists.',
  '人気のない意見: 本をたくさん読んでも賢くならない。

本をたくさん「読了」すると賢くなる。

10冊を途中で放置 = 何も学ばない
3冊を最後まで読む = 思考が変わる

だからCommitを作った。',
  ARRAY['reading', 'unpopularopinion', 'learning'],
  false,
  'none',
  NULL
),
(
  'contrarian_motivation',
  'engagement',
  'Everyone says: "You just need more motivation to read."

Wrong.

You need consequences.

Motivation fades. Deadlines don''t.
That''s the Commit philosophy.',
  'みんな言う: 「読書にはもっとモチベーションが必要」

違う。

必要なのは結果（ペナルティ）。

モチベーションは消える。締め切りは消えない。
それがCommitの哲学。',
  ARRAY['reading', 'motivation', 'productivity'],
  false,
  'none',
  NULL
),
(
  'contrarian_readers',
  'engagement',
  '9 out of 10 "book lovers" are actually book BUYERS.

The difference? Finishing.

Commit turns buyers into readers.
One deadline at a time.',
  '10人中9人の「本好き」は実は本の「購入者」。

違いは？読了するかどうか。

Commitは購入者を読者に変える。
一つの締め切りずつ。',
  ARRAY['reading', 'books', 'truth'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Story Thread テンプレート (ストーリー形式)
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'story_founder_journey',
  'build_in_public',
  'I had 50+ unread books. Every time I walked past them, I felt guilty.

One day I asked: "What if that guilt cost me money?"

That question became Commit.

Now I''m building an app that makes you pay if you don''t read.

It sounds harsh. But it works.',
  '50冊以上の積読があった。本棚の前を通るたびに罪悪感を感じていた。

ある日思った。「この罪悪感にお金がかかったら？」

その疑問がCommitになった。

読まなかったらお金を払うアプリを作っている。

厳しく聞こえる。でも効く。',
  ARRAY['buildinpublic', 'founderjourney', 'reading'],
  false,
  'none',
  NULL
),
(
  'story_user_win',
  'engagement',
  'Got a message today:

"I just finished my first book in 2 years. The deadline scared me, but the donation goal motivated me."

This is why I build Commit.

Not for the money. For moments like this.',
  '今日メッセージが来た:

「2年ぶりに本を読み終えました。締め切りは怖かったけど、寄付目標が励みになりました。」

これがCommitを作る理由。

お金のためじゃない。こういう瞬間のため。',
  ARRAY['buildinpublic', 'usersuccess', 'testimonial'],
  false,
  'none',
  NULL
),
(
  'story_problem_discovery',
  'problem_solution',
  'The moment I knew I needed Commit:

I found a receipt inside a book I bought 3 years ago.

The book was still shrink-wrapped.

I had spent more time feeling guilty about it than it would take to read it.

Never again.',
  'Commitが必要だと気づいた瞬間:

3年前に買った本の中からレシートを見つけた。

本はまだビニール包装のまま。

読むのにかかる時間より、罪悪感を感じる時間の方が長かった。

もう二度と。',
  ARRAY['reading', 'tsundoku', 'relatable'],
  false,
  'none',
  NULL
);

-- ============================================================
-- High-Engagement Hybrid テンプレート (複合型)
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'hybrid_question_number',
  'engagement',
  'Quick poll:

How many unread books do you own right now?

A) 1-5 (manageable)
B) 6-15 (concerning)
C) 16-30 (it''s a problem)
D) 30+ (we need to talk)

Reply with your letter. I''ll share my answer in the comments.',
  'クイックアンケート:

今、積読は何冊ありますか？

A) 1-5冊 (許容範囲)
B) 6-15冊 (気になる)
C) 16-30冊 (問題あり)
D) 30冊以上 (話し合いが必要)

あなたの答えをリプライで。僕の答えはコメントで。',
  ARRAY['reading', 'poll', 'engagement'],
  false,
  'none',
  NULL
),
(
  'hybrid_story_cta',
  'engagement',
  'When I was 25, I thought owning books = being smart.
At 30, I realized reading books = being smart.
At 35, I learned finishing books = growing.

If you''re stuck at stage 1 or 2, there''s hope.

Commit is the bridge to stage 3.',
  '25歳の時、本を持つこと = 賢いと思ってた。
30歳で、本を読むこと = 賢いと気づいた。
35歳で、本を読了すること = 成長すると学んだ。

ステージ1や2で止まってるなら、希望がある。

Commitはステージ3への橋渡し。',
  ARRAY['reading', 'growth', 'wisdom'],
  false,
  'none',
  NULL
),
(
  'hybrid_before_after_numbers',
  'problem_solution',
  'Before Commit:
- 47 unread books
- 0 finished this year
- 100% guilt

After 3 months with Commit:
- 38 unread books
- 9 finished
- $180 saved (almost donated)
- 0% guilt

The math works.',
  'Commit前:
- 積読47冊
- 今年の読了0冊
- 罪悪感100%

Commit後3ヶ月:
- 積読38冊
- 読了9冊
- 18,000円セーブ（寄付しそうになった）
- 罪悪感0%

計算は合う。',
  ARRAY['reading', 'beforeafter', 'results'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Verify Insert
-- ============================================================
-- SELECT name, category FROM post_templates WHERE name LIKE 'number_hook%' OR name LIKE 'contrarian%' OR name LIKE 'story_%' OR name LIKE 'hybrid_%' ORDER BY category, name;
