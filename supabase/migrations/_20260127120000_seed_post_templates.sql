-- X投稿テンプレート シードデータ
-- カテゴリ: build_in_public, problem_solution, visual, engagement, micro

-- ============================================================
-- Build in Public テンプレート
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'origin_story',
  'build_in_public',
  'I built Commit because I have 50+ unread books on my shelf. The guilt was real. Now I put money on the line - if I don''t finish, it goes to charity. Day {days_since_launch} of building this.',
  '本棚に50冊以上の積読があった。罪悪感がすごかった。だからCommitを作った。読み終わらなかったらお金が寄付される仕組み。開発{days_since_launch}日目。',
  ARRAY['buildinpublic', 'indiedev', 'reading'],
  false,
  'none',
  NULL
),
(
  'tech_stack',
  'build_in_public',
  'Tech stack for Commit:
- React Native + Expo
- Supabase (auth, db, storage)
- Edge Functions (Deno)
- Stripe for payments

Why? Ship fast, iterate faster. {active_users} users so far.',
  'Commitの技術スタック:
- React Native + Expo
- Supabase
- Edge Functions (Deno)
- Stripe決済

なぜこの構成？素早く出して、素早く改善するため。現在{active_users}人のユーザー。',
  ARRAY['buildinpublic', 'techstack', 'reactnative', 'supabase'],
  false,
  'none',
  NULL
),
(
  'milestone_update',
  'build_in_public',
  'Milestone: {total_books_completed} books completed through Commit so far. Each one is someone who beat their tsundoku. {total_donated} yen donated to charity from those who didn''t make it.',
  'マイルストーン: Commit経由で{total_books_completed}冊の本が読了された。積読を倒した人たち。読めなかった人からは{total_donated}円が寄付に回った。',
  ARRAY['buildinpublic', 'milestone', 'reading'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Problem/Solution テンプレート
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'problem_awareness',
  'problem_solution',
  'The average person buys 10 books a year but only finishes 4. Where do the other 6 go? Your shelf. Then your guilt. Then nowhere.

Commit turns that guilt into motivation.',
  '平均的な人は年に10冊本を買って、4冊しか読み終わらない。残り6冊は？本棚に。そして罪悪感に。そしてどこにも行かない。

Commitはその罪悪感をモチベーションに変える。',
  ARRAY['reading', 'tsundoku', 'books'],
  true,
  'ai_image',
  'A bookshelf overflowing with unread books, some with dust, warm amber lighting casting shadows. Minimalist style, dark background.'
),
(
  'before_after',
  'problem_solution',
  'Before Commit: "I''ll read it someday"
After Commit: Deadline in 2 weeks, $20 on the line

Funny how a little pressure changes everything.',
  'Commit前: 「いつか読む」
Commit後: 2週間後が締め切り、2000円かかってる

少しのプレッシャーで全てが変わる。',
  ARRAY['reading', 'productivity', 'habits'],
  false,
  'none',
  NULL
),
(
  'pain_point',
  'problem_solution',
  'That book you bought 6 months ago is still in plastic wrap. You know which one I''m talking about.

Commit exists because I was you. I AM you.',
  '半年前に買った本、まだビニール包装のままでしょ。どの本のことか分かってる。

Commitを作ったのは、僕もあなただったから。今もそう。',
  ARRAY['reading', 'books', 'relatable'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Visual テンプレート
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'feature_deep_dive',
  'visual',
  'Monk Mode in Commit: When you really need to focus.

Lock in your reading session. No distractions. Just you and the book. Timer running. Progress tracking.',
  'CommitのMonk Mode: 本気で集中したい時に。

読書セッションをロックイン。邪魔なし。本と自分だけ。タイマー起動。進捗トラッキング。',
  ARRAY['focus', 'reading', 'productivity', 'deepwork'],
  true,
  'screenshot',
  NULL
),
(
  'hall_of_fame',
  'visual',
  'The Hall of Fame: Where completed commitments live forever.

Each card is a book someone actually finished. A promise kept. A tsundoku defeated.',
  '殿堂入り: 達成したコミットメントが永遠に残る場所。

一枚一枚が誰かが本当に読み終えた本。約束を守った証。積読を倒した記録。',
  ARRAY['reading', 'achievement', 'books'],
  true,
  'screenshot',
  NULL
),
(
  'ui_showcase',
  'visual',
  'Designed Commit with one goal: make you want to open the app. Dark mode default. Warm amber accents. Luxury feel for your reading journey.',
  'Commitのデザイン目標は一つ: アプリを開きたくなること。ダークモードがデフォルト。暖かいアンバーのアクセント。読書の旅にラグジュアリー感を。',
  ARRAY['design', 'uidesign', 'darkmode', 'app'],
  true,
  'screenshot',
  NULL
);

-- ============================================================
-- Engagement テンプレート
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'question_hook',
  'engagement',
  'Honest question: What''s the oldest unread book on your shelf right now?

Mine was 3 years old before I built Commit.',
  '正直に聞きたい: 今、本棚で一番古い積読は何年前の本？

僕はCommitを作る前、3年前の本があった。',
  ARRAY['reading', 'books', 'question'],
  false,
  'none',
  NULL
),
(
  'poll_style',
  'engagement',
  'If you don''t finish a book you committed to, would you rather:

A) Lose $20
B) Have that $20 go to charity

The answer shaped how I built Commit.',
  'コミットした本を読み終えられなかった時、どっちがいい？

A) 2000円を失う
B) 2000円が寄付になる

この答えがCommitの設計を決めた。',
  ARRAY['reading', 'charity', 'question'],
  false,
  'none',
  NULL
),
(
  'controversial_take',
  'engagement',
  'Hot take: Buying books isn''t the problem. It''s having no consequence for not reading them.

Commit adds that consequence. Your wallet or charity.',
  '物議を醸す意見: 本を買うことが問題じゃない。読まないことに結果がないのが問題。

Commitはその結果を追加する。財布か寄付か。',
  ARRAY['reading', 'books', 'hottake'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Micro Update テンプレート
-- ============================================================

INSERT INTO post_templates (name, category, template_en, template_ja, hashtags, media_required, media_type, image_prompt_hint)
VALUES
(
  'daily_stat',
  'micro',
  '{active_users} active readers this month. {total_books_completed} books completed. Small numbers, real impact.',
  '今月のアクティブ読者{active_users}人。読了{total_books_completed}冊。小さな数字、リアルなインパクト。',
  ARRAY['buildinpublic', 'stats'],
  false,
  'none',
  NULL
),
(
  'quick_tip',
  'micro',
  'Commit tip: Set your deadline for 2-3 weeks out. Long enough to be realistic, short enough to feel the pressure.',
  'Commitのコツ: 締め切りは2-3週間後に設定。現実的に長く、プレッシャーを感じるほど短く。',
  ARRAY['reading', 'tips', 'productivity'],
  false,
  'none',
  NULL
),
(
  'feature_teaser',
  'micro',
  'Working on something new for Commit. Hint: it involves your bookshelf and ISBN scanning. Stay tuned.',
  'Commitの新機能を開発中。ヒント: 本棚とISBNスキャン。お楽しみに。',
  ARRAY['buildinpublic', 'teaser'],
  false,
  'none',
  NULL
),
(
  'gratitude',
  'micro',
  'Someone just finished their commitment on Commit. One more tsundoku conquered. This is why I build.',
  '誰かがCommitでコミットメントを達成した。また一つの積読が倒された。だから僕は作り続ける。',
  ARRAY['buildinpublic', 'gratitude', 'reading'],
  false,
  'none',
  NULL
),
(
  'shipping_update',
  'micro',
  'Just shipped a small update to Commit: faster book search, smoother animations. The little things matter.',
  'Commitの小さなアップデートをリリース: 検索高速化、アニメーション改善。小さなことが大事。',
  ARRAY['buildinpublic', 'shipping', 'indiedev'],
  false,
  'none',
  NULL
);

-- ============================================================
-- Verify Insert
-- ============================================================
-- SELECT name, category, is_active FROM post_templates ORDER BY category, name;
