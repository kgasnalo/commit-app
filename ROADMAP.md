# Agentic Roadmap: COMMIT App (Master Plan)

This roadmap is designed for **Autonomous AI Agents (Claude Code)** and Engineering Teams.
Do **NOT** skip steps. Do **NOT** combine tasks unless explicitly instructed.
Each task is atomic, role-specific, and has a clear definition of done.

**Status Update:**
- Phase 1-3: Core features stabilized.
- Phase 3.5 (MVP): Simplified User Profile (Username/Date) & Account Management.
- Phase 7: "Web Companion Model" for compliant payments.
- Phase 8: Ops, Reliability, Analytics, and Lifecycle Management (Force Updates/Maintenance).

---

## 🟢 Phase 1: Interactive Core Components & Fairness

**Objective:** Implement high-quality, animated interactive components and ensure the commitment logic is fair and robust.

- [x] **1.1 Interactive Slider (Page Count)**
    - **Role:** `[Frontend Specialist]`
    - **Action:** Create `src/components/AnimatedPageSlider.tsx`.
    - **DoD:** Component handles gestures smoothly (60fps) and provides tactile feedback.

- [x] **1.2 Amount Setting (Penalty)**
    - **Role:** `[Frontend Specialist]`
    - **Action:** Create `src/components/PenaltyAmountInput.tsx`.
    - **DoD:** Functional amount input with visible darkening effect and disclaimer.

- [x] **1.3 Quick Continue Flow**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Enable "Continue Reading" flow from history.
    - **DoD:** "Continue" button immediately starts new commitment with progress-aware defaults.

- [x] **1.4 UX Overhaul - Group Commitments, Enhance Card UI**
    - **Role:** `[UX Engineer]`
    - **Action:** Group commitments by book and improve verification UX.
    - **DoD:** Dashboard is organized; Success modal drives retention.

- [x] **1.5 Completion Celebration (The Reward)**
    - **Role:** `[Animation Specialist]`
    - **Action:** Implement confetti and "Money Saved" counter.
    - **DoD:** Exciting visual feedback upon completion.

- [x] **1.6 Fix UI Flicker during Login Flow**
    - **Role:** `[Core Engineer]`
    - **Action:** Stabilize auth state management.
    - **DoD:** Smooth login transition without flashes.
    - **Phase 2 Fix (2026-01-15):** Auth画面からの既存ユーザー再ログイン時のUIフリッカー修正
      - `loginSource: 'auth_screen'`フラグでAuth画面ログインを識別
      - タイムアウト時はfinally blockで状態設定をスキップ、ローディング維持
      - バックグラウンドチェック完了後に状態設定（Onboarding7のチラつき防止）

- [x] **1.7 Success Modal UI/UX Polish**
    - **Role:** `[UI/UX Designer]`
    - **Action:** Refine micro-interactions of the celebration modal.
    - **DoD:** Premium feel with fluid animations.

- [x] **1.8 The Lifeline (Emergency Freeze)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Implement "Fairness Valve" via Edge Function.
    - **Details:** One-time freeze per commitment. Log MUST be server-side to prevent cheating.
    - **DoD:** User can extend deadline once; DB updates securely.

- [x] **1.9 Hyper Scanner (ISBN Barcode)**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Integrate Camera for barcode scanning.
    - **Security:** Proxy Google Books API calls via Supabase to hide keys.
    - **DoD:** Scan book -> Instant Commitment screen (< 2 sec).

---

## 🌌 Phase 2: Agentic Roadmap: The "Cinematic" Onboarding Flow

**Objective:** Create a fluid, emotionally intelligent onboarding experience.

### Phase 2.0: The Atmosphere (The Stage) ✅
- [x] **2.0.1 The Living Background:** Persistent Mesh Gradient (Skia).
- [x] **2.0.2 The "Reactive" Toast System:** Conversational feedback.
- [x] **2.0.3 Global Animation & Audio Config:** Physics and SoundManager.

### Phase 2.1: Act 1 - The Awakening (Screens 0-4)
- [x] **2.1.1 Screen 0 (Welcome):** Kinetic Intro.
- [x] **2.1.2 Screen 1 (Tsundoku):** Visual Weight Wheel Picker.
- [ ] **2.1.3 Screen 3 (Selection):** The Anchor Object (Shared Element Transition).
- [x] **2.1.4 Screen 3 (Manual Entry):** Manual book entry fallback for books not found in Google Books API.
    - **Implementation:**
      - `ManualBookEntryScreen.tsx` with Title/Author/Pages/Cover input
      - Advanced search query builder (ISBN detection, intitle:/inauthor: operators)
      - Search result filtering and ranking by quality score
      - FlatList with ListFooterComponent for "Can't find?" CTA
      - DB schema: `google_books_id` nullable, `total_pages`, `is_manual` columns
      - Edge Function: `create-commitment` manual entry support
      - Storage: `book-covers` bucket with public read + authenticated/public upload policies

### Phase 2.2: Act 2 - The Crisis (Screens 5-10)
- [x] **2.2.1 Screen 5 (Penalty):** Haptic Resistance Slider.
- [x] **2.2.2 Screen 6 (Account):** Google OAuth with Username Persistence.
    - **Implementation:**
      - Username persisted to AsyncStorage before OAuth redirect
      - AppNavigator creates user record after OAuth callback via Deep Link
      - URL Polyfill in `index.js` (first import) for `new URL()` support
      - `checkSubscriptionStatus` timeout (2s) and reduced retries (1x)
      - Robust auth initialization with `withTimeout` helper (5s/8s timeouts)
      - `try-finally` pattern guarantees UI unlocking (prevents zombie state)
- [x] **2.2.3 Screen 7 (Opportunity Cost):** Burning Text Effect (Shader).

### Phase 2.3: Act 3 - The Covenant (Screens 11-15) ✅
- [x] **2.3.1 Screen 12 (The Plan):** Blueprint drawing animation.
- [x] **2.3.2 Screen 13 (The Paywall):** Slide-to-Commit interaction.
    - **Implementation:**
      - Commitment creation via Edge Function (not direct INSERT)
      - Edge Function handles book upsert + commitment insert
      - Bypasses RLS with service_role key
      - **Deploy with `--no-verify-jwt`** (Gateway rejects ES256 tokens; function does internal auth)
- [x] **2.3.3 Screen 15 (The Transition):** Warp Speed transition.

---

## 🟡 Phase 3: Release Blockers (Stabilization)

**Objective:** Ensure the app is stable, type-safe, and configurable.

- [x] **3.1 Environment & Configuration Safety**
- [x] **3.2 Global Error Handling**
- [x] **3.3 Strict Type Definitions (Supabase)**
- [x] **3.4 Critical UI Edge Cases**

---

## 👤 Phase 3.5: User Profile & Settings (The Control Room)

**Objective:** Essential account management for App Store compliance and user trust.

- [x] **3.5.1 User Profile UI (MVP)**
    - **Role:** `[UI Designer]`
    - **Action:** Create `src/screens/ProfileScreen.tsx`.
    - **Details:** Simple display of Username (or Email) and "Member Since [Date]".
    - **Note:** Keep it minimal. No complex stats for V1.
    - **DoD:** User can see their identity and registration date.

- [x] **3.5.2 Settings Navigation & Legal Links**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Implement Settings menu.
    - **Items:** "Manage Payment (Web)", "Terms", "Privacy", "Support".
    - **DoD:** Links open external Web Portal/pages correctly.

- [x] **3.5.3 Account Deletion (Apple Requirement) 🚨**
    - **Role:** `[Backend Engineer]`
    - **Action:** Implement "Delete Account" via Edge Function.
    - **Logic:** Delete Supabase Auth user + Profiles + Cancel Stripe Customer.
    - **DoD:** Irreversible deletion of all user data.

- [x] **3.5.4 Contact / Support Flow**
    - **Role:** `[Frontend Engineer]`
    - **Action:** "Contact Support" button (mailto or form link).
    - **DoD:** User can initiate a support request.

---

## 🔵 Phase 4: Engagement, Retention & Virality

**Objective:** Integrate world-class trends to keep users engaged.

- [x] **4.1 Dynamic Pacemaker (Notifications)**
    - **Action:** Smart local notifications ("Read X pages today").

- [x] **4.2 The Commitment Receipt**
    - **Action:** Receipt-style image generation sharing.

- [x] **4.3 Monk Mode**
    - **Action:** Strict focus timer with ambient sound.

- [x] **4.4 Lock Screen Live Activity**
    - **Action:** iOS Dynamic Island widget.

- [x] **4.5 Advanced Animation Polish**
    - **Action:** Refine micro-interactions.

- [x] **4.6 Reading DNA**
    - **Action:** Visualize reading habits (Speed, Time).

- [x] **4.7 The Hall of Fame**
    - **Action:** Netflix-style library for completed books.

- [x] **4.8 Review & Rating Strategy (Growth)**
    - **Role:** `[Product Manager]`
    - **Action:** Implement StoreKit In-App Review API.
    - **Trigger:** Prompt user for a rating ONLY after a "Positive Moment" (e.g., Successfully completing a commitment). Never prompt after a penalty.
    - **Implementation:**
      - `expo-store-review` package
      - `ReviewService.ts` with 90-day cooldown
      - Integrated in `VerificationScreen.tsx` (all 3 exit handlers)
    - **DoD:** App requests review at appropriate high-engagement moments. ✅

- [x] **4.9 Leaderboard (Ranking Feature)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Implement monthly/yearly leaderboard with dashboard badge.
    - **Implementation (2026-01-21):**
      - `LeaderboardScreen.tsx`: Titan Design System準拠、月間/年間タブ切り替え
      - ポディウム (上位3名): 🥇🥈🥉 メダル表示
      - ランキングリスト: 上位100名まで表示（パフォーマンス最適化）
      - 同率順位対応（同じ冊数は同順位）
      - 自分の行: オレンジ色ハイライト + "あなた" マーカー
      - 「あなたの成績」カード: 全参加者中の順位表示（100位外でも正確な順位）
      - `show_in_ranking=false` のユーザーは除外
      - Dashboard: ストリークバッジ横に🏆ランキングバッジ追加
      - i18n: 3言語対応 (ja/en/ko)
    - **Files:**
      - `src/screens/LeaderboardScreen.tsx` (新規)
      - `src/screens/DashboardScreen.tsx` (バッジ追加)
      - `src/navigation/AppNavigator.tsx` (画面登録)
      - `src/i18n/locales/*.json` (キー追加)
    - **DoD:** ユーザーがダッシュボードからランキングを確認可能。✅

- [x] **4.10 Job-Based Book Recommendations (職種別推薦)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Recommend books popular among users with the same profession.
    - **Implementation (2026-01-22):**
      - DB: `users.job_category` column added
      - Onboarding: `OnboardingScreen1_5_JobCategory.tsx` for profession selection
      - Edge Function: `job-recommendations` aggregates completed books by job category
      - Privacy: Only `show_in_ranking=true` users, k-anonymity threshold (3+ users)
      - UI: `JobRecommendations.tsx` horizontal scroll card component
      - i18n: 9 job categories in ja/en/ko
    - **Files:**
      - `supabase/migrations/20260122100000_add_job_category.sql`
      - `src/screens/onboarding/OnboardingScreen1_5_JobCategory.tsx` (新規)
      - `supabase/functions/job-recommendations/index.ts` (新規)
      - `src/components/JobRecommendations.tsx` (新規)
    - **DoD:** Users see "Popular among [profession]" book recommendations. ✅

- [x] **4.11 iOS Home Screen Widget**
    - **Role:** `[Mobile Engineer]`
    - **Action:** WidgetKit implementation showing reading progress.
    - **Implementation (2026-01-22):**
      - App Groups: `group.com.kgxxx.commitapp` for data sharing
      - Swift Widget: `COMMITWidget.swift` (Small + Medium sizes)
      - Native Module: `WidgetModule.swift` + `.m` bridge
      - TypeScript: `WidgetService.ts` for React Native integration
      - Trigger: Dashboard updates widget on data fetch
    - **Files:**
      - `ios/LiveActivity/COMMITWidget.swift` (新規)
      - `ios/COMMIT/WidgetModule.swift` (新規)
      - `ios/COMMIT/WidgetModule.m` (新規)
      - `src/lib/WidgetService.ts` (新規)
    - **Pending:** iOS rebuild required (`npx expo prebuild && ./run-ios-manual.sh`)
    - **DoD:** Widget displays book title, progress, and deadline on home screen. 🔶

- [x] **4.12 Job-Based Ranking UI (職種別ランキング表示機能)**
    - **Role:** `[Fullstack Engineer]`
    - **Priority:** Medium
    - **Status:** ✅ 全Phase完了 (2026-01-22)
    - **Depends on:** 4.10 (Job-Based Recommendations) ✅ 完了済み

    ### 背景・目的
    4.10で職種データ収集・集計基盤は完成。本タスクは「そのデータをどこでどう見せるか」を実装する。

    **ユーザー向け:**
    - 「自分と同じ職種の人がどんな本を読んでいるか」を発見できる
    - 本選びの参考になる

    **管理者向け:**
    - SNS投稿用素材（「エンジニアに人気の本TOP10」等）として活用

    ### 設計上の決定事項 (2026-01-22 議論)

    #### 1. Top100 vs Top10
    - **決定:** まずはTop10から開始
    - **理由:**
      - k-anonymity制約（3人以上のデータがないと表示しない）
      - 職種9種 × 言語圏3つ = 27セグメント → データが分散
      - 初期段階でTop100は「同じ本が1人ずつ」のスカスカになるリスク
    - **将来:** データ蓄積後にTop100へ拡張可能

    #### 2. 言語圏分割
    - **決定:** 当面は分けない
    - **理由:**
      - 分けるとデータがさらに薄くなる
      - Google Books IDはグローバル（同じ本でも言語版が違う可能性）
    - **代替案（将来）:**
      - 本タイトルの言語検出 → ユーザー言語設定と一致するものを優先
      - 「日本語の本のみ表示」トグル

    #### 3. 期間別ランキング
    - **決定:** 全期間 + 月間の2軸
    - **理由:**
      - **全期間:** 「定番」を知りたいユーザー向け、データが安定
      - **月間:** 「今流行ってる」を知りたい、SNS投稿向け
      - 年間は中途半端（「去年」のデータは古く感じる）

    #### 4. 表示場所
    - **決定:** ダッシュボードにカード表示 → タップで詳細画面
    - **理由:**
      - 「設定から見れる」は発見性が低い
      - 毎日見るダッシュボードに自然に存在 → 行動喚起しやすい
    - **UI構成:**
      ```
      ダッシュボード
      ├── 現在のコミットメント
      ├── 月間ランキング（既存 4.9）
      ├── 🆕「エンジニアに人気」カード ← 小さく表示
      │
      └── タップすると...
          └── 職種別ランキング詳細画面（Top10、全期間/月間切り替え）
      ```

    ### 段階的実装アプローチ

    #### Phase 1: ダッシュボードカード ✅ (2026-01-22)
    - [x] `DashboardScreen.tsx` に `JobRecommendations` コンポーネント統合
    - [x] ユーザーの `job_category` が設定済みの場合のみ表示
    - [x] 全期間Top10を横スクロールで表示
    - [x] タップで詳細画面へナビゲート

    #### Phase 2: 詳細ランキング画面 ✅ (2026-01-22)
    - [x] `JobRankingScreen.tsx` 新規作成
    - [x] 全期間 / 月間 タブ切り替え
    - [x] Top10リスト表示（読了者数付き）
    - [x] Titan Design System準拠（LeaderboardScreenと統一感）
    - [x] 全9職種の横スクロールタブ
    - [x] Settingsからの導線追加

    #### Phase 3: Web Portal管理画面 ✅ (2026-01-22)
    - [x] `/admin/job-rankings` ページ追加
    - [x] 全職種のTop10を一覧表示（9職種 × 全期間/月間）
    - [x] スクショしやすいカード形式（SNS投稿用）
    - [x] CSV/JSONエクスポート機能
    - [x] Dashboard ↔ JobRankings ナビゲーションリンク

    ### 既存リソース（4.10で作成済み）
    - `supabase/functions/job-recommendations/index.ts` - データ集計Edge Function
    - `src/components/JobRecommendations.tsx` - 表示コンポーネント（ダッシュボード統合待ち）
    - `users.job_category` - 職種カラム
    - k-anonymity (3人以上) プライバシー保護

    ### Files Created/Modified
    - `src/screens/DashboardScreen.tsx` (JobRecommendations統合) ✅
    - `src/screens/JobRankingScreen.tsx` (新規) ✅
    - `src/screens/JobCategorySettingsScreen.tsx` (新規) ✅
    - `src/screens/SettingsScreen.tsx` (ランキング表示トグル + 導線追加) ✅
    - `src/navigation/AppNavigator.tsx` (画面登録) ✅
    - `src/components/JobRecommendations.tsx` (改善) ✅
    - `supabase/functions/job-recommendations/index.ts` (period対応) ✅
    - `src/i18n/locales/*.json` (キー追加) ✅
    - `commit-app-web/src/app/admin/job-rankings/page.tsx` ✅
    - `commit-app-web/src/app/admin/job-rankings/JobRankingsClient.tsx` ✅
    - `commit-app-web/src/app/admin/dashboard/AdminDashboardClient.tsx` (ナビ追加) ✅
    - `commit-app-web/src/i18n/locales/*.json` (admin.job_rankings追加) ✅

    ### DoD (Definition of Done)
    - [x] Phase 1: ダッシュボードに職種別カードが表示される ✅
    - [x] Phase 2: 詳細画面で全期間/月間の切り替えができる ✅
    - [x] Phase 3: Web Portalで全職種のランキングが一覧できる ✅

- [ ] **4.13 UI/UX Design Polish (Finexaトレース)**
    - **Role:** `[UI/UX Designer]`
    - **Priority:** Medium
    - **Objective:** Finexaデザインを参考に、アプリ全体のUI/UXを洗練させる

    ### 完了済みタスク (2026-01-22)
    - [x] **CommitmentCard 表紙サムネイル追加**
      - 左側に44x60pxの本の表紙を追加
      - expo-imageで高速キャッシュ
      - 表紙がない場合はプレースホルダー（📖アイコン）
      - ファイル: `src/components/CommitmentCard.tsx`

    - [x] **MonkMode Finexaスタイル背景**
      - 5層グラデーション → 2層対角線グラデーション
      - 左上オレンジグロー → 右下黒へフェード
      - ファイル: `src/screens/monkmode/MonkModeScreen.tsx`

    ### 検討中タスク
    - [ ] MonkModeActiveScreen (タイマー実行中) 同様のFinexaスタイル適用
    - [ ] DashboardScreen背景統一
    - [ ] 他画面のデザイン一貫性確認

---

## 🛠️ Phase 5: Technical Debt & Maintenance

- [x] **5.1 Migrate Audio System**
    - **Action:** Update `expo-av` to `expo-audio` (SDK 54).

---

## 🏁 Phase 6: Release Preparation (Pre-launch Checklist)

**Objective:** Clean up shortcuts and ensure legal/platform compliance.

- [x] **6.1 Remove Dev-only Auth Credentials**
- [x] **6.2 Final Animation Quality Audit**
- [x] **6.3 Production Environment Audit**
- [x] **6.4 Final Build & Smoke Test**

- [x] **6.5 App Store Guidelines Check**
    - **Role:** `[Product Owner]`
    - **Action:** Verify NO native payment screens for penalties. All must route to Web.
    - **DoD:** Compliance with Apple Guidelines 3.1.1 & 3.2.1.

- [x] **6.6 Legal & Compliance (Launch Critical)**
    - **Role:** `[Legal/Product Owner]`
    - **Action:** Create Web Pages for:
        - Terms of Service (Define Penalty rules)
        - Privacy Policy (Data usage)
        - Tokushoho (特商法) (Japanese Web Payment requirement)
    - **DoD:** Legal footer exists on Web Payment Portal.

- [x] **6.7 Legal Consent Versioning (Compliance)**
    - **Role:** `[Backend Engineer]`
    - **Action:** Store `legal_consent_version` in user profile.
    - **Logic:** If `CURRENT_LEGAL_VERSION > user_consent_version`, force show LegalConsentScreen on launch blocking usage until agreed.
    - **Implementation (2026-01-19):**
      - DB Migration: `legal_consent_version TEXT` column added to users table
      - `src/config/legalVersions.ts`: Version management with `needsLegalConsent()` helper
      - `src/screens/LegalConsentScreen.tsx`: Full consent UI with checkbox + agree button
      - `src/components/LegalBottomSheet.tsx`: WebView-based in-app document viewer
      - AppNavigator: Checks consent status, shows LegalConsentScreen before MainTabs
      - SettingsScreen: Uses LegalBottomSheet for terms/privacy (no external browser)
    - **DoD:** Infrastructure to force-renew consent when legal terms change. ✅

- [x] **6.8 Pre-Release Compliance Audit (2026-01-23)**
    - **Role:** `[Security/Compliance Engineer]`
    - **Action:** Comprehensive audit for store submission blockers.
    - **Fixes Applied:**
      - [x] `moti` パッケージ削除 (Reanimated v4非互換クラッシュ防止)
      - [x] Paywall画面ハードコード英語 → i18n.t() 修正
      - [x] 韓国語locale追加 (`locales/ko.json` + app.json登録)
      - [x] app.json plugin権限文言を英語fallbackに変更
      - [x] PII除去: console.logとSentryからemail参照削除
      - [x] 未使用RECORD_AUDIO権限削除
    - **Remaining SHOWSTOPPER:** Apple IAP未実装 (→ 7.9)
    - **Remaining (Build-time):** Stripe本番キー差し替え (.env)
    - **DoD:** CRITICAL/HIGH/MEDIUM項目すべて修正済み ✅

---

## ⚙️ Phase 7: The Engine (Web Companion & Security)

**Priority: CRITICAL** (Concurrent with Phase 2/3)
**Objective:** Secure infrastructure for payments via Web Portal (Apple Compliance).

- [x] **7.1 Web Payment Portal (Next.js)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Deploy minimal Vercel app sharing Supabase project.
    - **Features:** Login (Auth), Stripe Elements (Card Setup).
    - **DoD:** User can save credit card securely on the web.
    - **Production URL:** https://commit-app-web.vercel.app

- [x] **7.2 Deep Linking & Handoff**
    - **Role:** `[Mobile Engineer]`
    - **Action:** App (Linking) <-> Web Redirects.
    - **DoD:** Seamless flow: App -> Web (Set Card) -> App (Toast "Card Updated").
    - **Implementation:**
      - App: `Linking.openURL()` in SettingsScreen.tsx
      - Web: `commitapp://` scheme redirect in success/page.tsx
      - Supabase: Auth redirect URLs configured via CLI

- [x] **7.3 Push Notification Infrastructure (Prerequisite)**
    - **Role:** `[Backend Engineer]`
    - **Action:** Setup Expo Push Notifications & Supabase Tables.
    - **DoD:** Server can send a test notification to a specific user.
    - **Implementation:**
      - DB: `expo_push_tokens` table with RLS
      - Mobile: `NotificationService.registerForPushNotifications()` (auto-called on auth)
      - Server: `send-push-notification` Edge Function deployed
    - **7.3.1 Announcements/Donations Push Notifications (2026-01-20):** ✅
      - DB Triggers: `notify_announcement_published()`, `notify_donation_posted()`
      - pg_net calls `send-push-notification` Edge Function on publish/insert
      - `UnreadService.ts`: AsyncStorage-based unread count management
      - `UnreadContext.tsx`: Global state with Supabase Realtime subscription
      - Settings tab badge shows unread count
      - AnnouncementsScreen/DonationHistoryScreen mark as read on focus

- [x] **7.4 "The Reaper" (Automated Deadline Enforcer)**
    - **Role:** `[Backend Engineer]`
    - **Action:** `pg_cron` + Edge Function.
    - **Logic:** Hourly check -> Mark Defaulted -> Stripe Off-Session Charge -> Push Notification.
    - **DoD:** Automated penalty charge and notification upon deadline miss.
    - **Implementation:**
      - `penalty_charges` table for charge tracking
      - `process-expired-commitments` Edge Function
      - Vault secrets for secure cron authentication
      - Hourly + 4-hour retry cron jobs

- [x] **7.5 Row Level Security (RLS) Hardening**
    - **Role:** `[Security Engineer]`
    - **Action:** Lock down commitments table.
    - **Rules:** No DELETE, No UPDATE to 'completed' if deadline passed.
    - **Implementation:**
      - DELETE policy intentionally omitted (users cannot delete)
      - UPDATE restricted: `deadline > NOW()` AND `status = 'pending'`
      - WITH CHECK ensures only `status = 'completed'` is allowed
      - `penalty_charges`: SELECT only for users, full access for service_role

- [x] **7.6 Server-side Validation**
    - **Role:** `[Security Engineer]`
    - **Action:** Move commitment creation to Edge Function with validation.
    - **Implementation:**
      - `create-commitment` Edge Function with amount/deadline/page validation
      - Google Books API page count verification (soft fail)
      - Multi-currency amount limits (JPY: 50-50000, USD: 1-350, etc.)
      - Deadline must be 24+ hours in future
      - RLS INSERT policy removed (forces Edge Function usage)
    - **Bugfix (2026-01-21):** PAGE_COUNT_EXCEEDS_BOOK error when setting max pages
      - Root cause: Google Books Search API vs Individual Lookup API return different pageCount
      - Fix: Client sends `book_total_pages`, server trusts client value over re-fetching
    - **DoD:** All commitment creation goes through server-side validation.

- [x] **7.7 Internal Admin Dashboard (Ops)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Simple Retool/Admin view for Support.
    - **Implementation:**
      - Admin Dashboard at `/admin/dashboard` (Web Portal)
      - `admin-actions` Edge Function for refund/complete
      - Email-based admin authentication in middleware
      - `admin_audit_logs` table for action tracking
    - **DoD:** Ability to Refund/Complete commitments manually.

- [x] **7.8 Payment Method Registration Flow (カード登録フロー)**
    - **Role:** `[Fullstack Engineer]`
    - **Priority:** HIGH (ペナルティシステムの有効化に必須)
    - **Note:** カード登録はペナルティ用。サブスクリプションはApple IAP/Google Play Billing経由。
    - **Problem:** オンボーディングでコミットメント作成時、カード未登録のためペナルティが機能しない
    - **Solution:** サブスク後にダッシュボードでカード登録を促すバナーを常時表示
    - **Implementation:**
      1. **DB Migration:** `users`テーブルに`payment_method_registered BOOLEAN DEFAULT false`追加
      2. **Onboarding説明文:** 金額設定画面（Screen10）に「サブスク後にカード登録が必要」の説明追加
      3. **Dashboard Banner:** カード未登録時に常時表示（dismiss不可）のバナーコンポーネント
      4. **Web Portal:** Stripe Elementsでカード登録ページ追加（`/billing/setup-card`）
      5. **Stripe Webhook:** `payment_method.attached`イベントで`payment_method_registered = true`に更新
      6. **Deep Link:** Web→App遷移でバナー非表示化
    - **UX Flow:**
      ```
      オンボーディング → サブスク登録 → 初回コミットメント作成
           ↓
      ダッシュボード（カード未登録バナー常時表示）
           ↓
      バナータップ → Web Portal (Stripe) でカード登録
           ↓
      Webhook → フラグ更新 → アプリに戻る → バナー消滅
      ```
    - **DoD:**
      - カード未登録ユーザーにバナー常時表示
      - カード登録後、バナーが消え、ペナルティが有効化

    ---
    ### 🟢 進捗メモ (2026-01-17更新)

    **完了済み:**
    - ✅ Web Portal i18n実装 (日本語・英語・韓国語)
    - ✅ `/billing` ページ: Stripe Elements カード登録フォーム
    - ✅ PKCE認証エラー修正: `/auth/callback` Route Handler追加
    - ✅ Stripe APIバージョン修正: SDKデフォルト使用
    - ✅ ユーザーレコード自動作成: `auth/callback`でupsert追加
    - ✅ **Vercel環境変数設定:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`追加
    - ✅ **カード入力UI改善:** 個別フィールド分離 (CardNumber/Expiry/CVC)
    - ✅ **カード削除機能:** `DELETE /api/stripe/delete-payment-method` + 確認モーダル
    - ✅ **カードブランドアイコン:** Visa/Mastercard/Amex対応

    **テスト手順:**
    1. https://commit-app-web.vercel.app/login にアクセス
    2. マジックリンクでログイン
    3. `/billing` でカード登録フォームが表示されることを確認
    4. テストカード `4242 4242 4242 4242` で登録テスト
    5. 「カードを削除」リンクで削除テスト

    **完了タスク:**
    - [x] Dashboard Banner (モバイルアプリ) ✅
    - [x] `payment_method_registered`フラグ管理 ✅
      - `save-payment-method`: `payment_method_registered: true` 設定済み
      - `delete-payment-method`: `payment_method_registered: false` 設定済み (2026-01-19)
    - [x] Stripe Webhook不要 - APIルートで直接フラグ更新
    ---

- [ ] **7.9 Apple IAP / Google Play Billing (サブスクリプション課金)**
    - **Role:** `[Mobile Engineer]`
    - **Priority:** CRITICAL (App Store審査必須)
    - **Problem:** 現在サブスクリプション課金が未実装。`subscription_status`は手動フラグのまま。
    - **Architecture Decision (2026-01-17):**
      - ❌ ~~Web Portal (Stripe) でサブスク解約~~ → App Store Guidelines 3.1.1違反
      - ✅ Apple IAP / Google Play Billing でサブスク管理
      - ✅ ユーザーはストアアプリから解約 (設定 > サブスクリプション)
    - **Implementation:**
      1. **ライブラリ選定:** `react-native-iap` or `expo-in-app-purchases`
      2. **ストア設定:**
         - Apple App Store Connect: Auto-Renewable Subscription設定
         - Google Play Console: Subscription product設定
      3. **Onboarding Paywall更新:**
         - `OnboardingScreen13_Paywall.tsx` をIAP対応に変更
         - 購入成功時に `subscription_status = 'active'`
      4. **Webhook実装:**
         - Apple Server-to-Server Notifications (Edge Function)
         - Google Real-time Developer Notifications (Edge Function)
         - 受信時: `subscription_status` / `subscription_cancellations` 更新
         - pending コミットメントを `cancelled` に変更
      5. **Receipt Validation:**
         - サーバーサイドでレシート検証 (Edge Function)
         - 不正購入防止
    - **DB準備済み (2026-01-17):**
      - ✅ `commitments.status` に `'cancelled'` 追加済み
      - ✅ `subscription_cancellations` テーブル作成済み
    - **DoD:**
      - ユーザーがアプリ内でサブスク購入可能
      - ストアアプリから解約可能
      - Webhook経由で `subscription_status` 自動更新

---

## 🛡️ Phase 8: Reliability, Ops & Analytics (Pro-Grade)

**Objective:** Monitoring, Automation, and Business Intelligence.

- [x] **8.1 Crash & Error Monitoring (Sentry)**
    - **Role:** `[DevOps Engineer]`
    - **Action:** Integrate Sentry across all platforms (App + Web + Edge Functions).
    - **Implementation:**
      - **Mobile App:**
        - `@sentry/react-native` SDK with **10% tracesSampleRate**
        - Sentry init in `App.js` with conditional DSN
        - Error logger (`src/utils/errorLogger.ts`) with captureException
        - User context tracking in AppNavigator (setUser on auth change)
        - MetricsService (`src/lib/MetricsService.ts`) for critical action tracking
        - Test utilities (`src/utils/sentryTest.ts`) for diagnostics
        - Plugin config in `app.json`
      - **Web Portal:**
        - `@sentry/nextjs` SDK with full integration
        - Client config (`sentry.client.config.ts`) - Replay + Tracing + Logging (**10% sampling**)
        - Server config (`sentry.server.config.ts`) - Node runtime monitoring (**10% sampling**)
        - Edge config (`sentry.edge.config.ts`) - Middleware support (**10% sampling**)
        - Instrumentation (`instrumentation.ts`) for Next.js
        - Global error boundary (`src/app/global-error.tsx`)
        - Test API endpoint (`/api/sentry-test`)
      - **Edge Functions (ALL 7 COVERED):**
        - Shared Sentry module (`_shared/sentry.ts`) for Deno SDK (**10% sampling**)
        - `SENTRY_DSN_EDGE` secret configured
        - `logBusinessEvent()` for success metrics (captureMessage, not breadcrumbs)
        - `create-commitment`: `commitment_created` event
        - `admin-actions`: `admin_refund_success`, `admin_mark_complete_success` events (PII-free)
        - `delete-account`: `account_deleted` event
        - `use-lifeline`: `lifeline_used` event
        - `isbn-lookup`: Error capture only
        - `send-push-notification`: `push_notification_batch` event
        - `process-expired-commitments`: `reaper_run_complete` event
    - **Audit Remediation (2026-01-13):**
      - Fixed "Fake Metrics": `incrementMetric` → `logBusinessEvent` (captureMessage)
      - Closed Coverage Gaps: All 7 Edge Functions now have Sentry
      - Fixed Sampling Rate: 1.0 → 0.1 (10%) to prevent quota exhaustion
      - Removed PII: `user.email` → `user.id` only in all logging
    - **DoD:** Crash reports and business events received in Sentry dashboard for all platforms.

- [x] **8.2 CI/CD Pipeline (GitHub Actions)**
    - **Role:** `[DevOps Engineer]`
    - **Action:** Automate build (EAS) and deploy (Edge Functions).
    - **Implementation (2026-01-13):**
      - GitHub Actions workflow: `.github/workflows/ci-cd.yml`
      - Job 1: Quality Check (TypeScript) - runs on all pushes/PRs (~27s)
      - Job 2: Deploy Edge Functions - runs on push to main only (~27s)
      - Maestro smoke test: `.maestro/smoke_test.yaml` (local execution)
      - All 7 Edge Functions auto-deployed on merge to main
    - **DoD:** Merge to `main` triggers auto-deployment. ✅

- [x] **8.3 Product Analytics (PostHog)**
    - **Role:** `[Product Manager]`
    - **Action:** Track key user events with PostHog analytics.
    - **Implementation:**
      - `posthog-react-native` SDK with Feature Flags, Session Replay, A/B Testing
      - `AnalyticsContext.tsx` provider with user identification
      - `AnalyticsService.ts` centralized tracking (replaces MetricsService)
      - Events: `app_launched`, `commitment_created/completed`, `lifeline_used`, `onboarding_completed`, `user_logged_out`, `account_deleted`, `book_scanned`, `monk_mode_session_*`, `verification_submitted`, `receipt_shared`
    - **DoD:** Dashboard shows "Commitment Completion Rate" and "Churn". ✅

- [x] **8.4 Remote Config & Force Update (The Kill Switch)**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Implement a check on app launch against PostHog Feature Flags.
    - **Implementation (2026-01-14):**
      - `RemoteConfigService.ts` with `useBlockingStatus()` hook
      - `expo-application` for native version detection
      - `ForceUpdateScreen.tsx` with App Store link
      - Semantic version comparison (1.0.0 < 1.0.1 < 1.1.0)
    - **Feature Flag:** `min_app_version` (String payload in PostHog)
    - **DoD:** Admin can force all users to update by changing PostHog flag value. ✅

- [x] **8.5 Maintenance Mode (Ops)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Global "Under Maintenance" switch via PostHog Feature Flag.
    - **Implementation (2026-01-14):**
      - `MaintenanceScreen.tsx` (Titan design, non-dismissible)
      - Integrated into AppNavigator (highest priority check)
      - i18n support (ja/en/ko)
    - **Feature Flag:** `maintenance_mode` (Boolean in PostHog)
    - **DoD:** Can take the entire service offline gracefully. ✅

---

## 🛠️ 技術的負債と品質改善 (Technical Debt & Quality Improvements)

### Level 1: Critical (Hotfixes) - 即時対応必須
- [x] **H.1 React 19 JSX Runtime Conflict Fix**
    - **Error:** `SyntaxError: Duplicate __self prop found` in `src/screens/CreateCommitmentScreen.tsx`.
    - **Cause:** React 19 (Automatic Runtime) conflicts with `babel-preset-expo` injecting `__self`.
    - **Fix:** Update `babel.config.js` presets to `['babel-preset-expo', { jsxRuntime: 'automatic' }]`.
    - **Status:** 🚨 **Critical Blocker** (App fails to bundle).

- [x] **H.2 Deprecated SafeAreaView Replacement**
    - **Warning:** `SafeAreaView has been deprecated...`
    - **Scope:** `App.js`, `DashboardScreen.tsx`, and all screens using native `SafeAreaView`.
    - **Fix:** Replace with `SafeAreaView` from `react-native-safe-area-context`.
    - **Status:** ✅ Already fixed - all 18 files use `react-native-safe-area-context`.

- [x] **H.3 Hardcoded Strings (Localization Failures)**
    - **Problem:** Japanese text hardcoded in logic, bypassing i18n system.
    - **Locations:**
        - `src/screens/VerificationScreen.tsx` (Line 76: `defaultValue`)
        - `app.json` (`photosPermission` in Japanese)
    - **Risk:** App rejection or poor UX for non-Japanese users.
    - **Fix:** Move all strings to `src/i18n/locales/*.json`.

- [x] **H.4 GO_BACK not handled エラー (複合原因)**
    - **Problem:** オンボーディング中に "GO_BACK not handled" エラーが発生。3つの根本原因が複合していた。
    - **Root Causes:**
      1. `withRepeat(-1)` の無限ループがクリーンアップなしで残存（アニメーション系）
      2. iOS スワイプバックジェスチャーがスタック最初の画面で発火
      3. OnboardingLayout の戻るボタンに `canGoBack()` ガードなし
    - **Fix Phase 1 (cancelAnimation追加):**
      - `src/components/onboarding/LivingBackground.tsx` (AnimatedOrb x, y)
      - `src/components/onboarding/PulsatingVignette.tsx` (pulseValue)
      - `src/components/onboarding/AshParticles.tsx` (予防的修正)
    - **Fix Phase 2 (ナビゲーション防御):**
      - `src/navigation/AppNavigator.tsx`: Onboarding0, Onboarding7 に `gestureEnabled: false`
      - `src/components/onboarding/OnboardingLayout.tsx`: `canGoBack()` ガード追加
      - `src/components/onboarding/WarpSpeedTransition.tsx`: `cancelAnimation` x6 追加
    - **Status:** ✅ 完全修正完了 (2026-01-23)

### Level 2: Warning (Refactoring) - バグの温床
- [ ] **W.1 Type Safety Enforcement**
    - **Problem:** Widespread use of `any` type and `as any` casting in navigation props and hooks.
    - **Locations:**
        - `src/screens/onboarding/*.tsx` (Almost all onboarding screens)
        - `src/screens/monkmode/MonkModeScreen.tsx`
        - `src/screens/LibraryScreen.tsx`
    - **Risk:** Runtime errors due to missing/incorrect route params.
    - **Fix:** Implement strictly typed `StackScreenProps` for all screens.

- [x] **W.2 Hardcoded Values & i18n Gaps**
    - **Problem:** Direct color codes (`#080604`, `#EC4899`) and strings mixed in UI logic.
    - **Locations:** `src/screens/BookDetailScreen.tsx` (TAG_COLORS), `src/theme/colors.ts`.
    - **Fix:** Move all colors to `src/theme` and enforce `i18n.t()` for all user-facing text.
    - **Implementation:** Added `tag.purple` and `tag.pink` to `src/theme/titan.ts`, updated BookDetailScreen to use theme colors.

- [ ] **W.3 Inline Styles Performance (16 locations)**
    - **Problem:** Usage of `style={{ ... }}` creates new objects on every render, causing unnecessary re-renders.
    - **Locations:**
        - `src/screens/RoleSelectScreen.tsx`
        - `src/components/AnimatedPageSlider.tsx`
        - `src/screens/monkmode/MonkModeScreen.tsx`
        - `src/screens/LibraryScreen.tsx` (and others)
    - **Fix:** Move all styles to `StyleSheet.create`.

### Level 3: Debt (Architecture) - メンテナンス性
- [x] **D.1 DRY: Background Component Extraction**
    - **Problem:** Complex `Titan Background` logic (LinearGradients) duplicated across multiple screens.
    - **Fix:** Create reusable `TitanBackground` component.
    - **Implementation:** Created `src/components/titan/TitanBackground.tsx` with props for ambientColor and showAmbient. Applied to 3 screens (ManualBookEntry, ForceUpdate, Profile). Remaining 11 screens can be updated incrementally.

- [x] **D.2 Console Log Cleanup**
    - **Problem:** 200+ `console.log` calls remaining in production code.
    - **Locations:** `MetricsService.ts`, `MonkModeService.ts`, `LiveActivityService.ts`, `AppNavigator.tsx`, and Onboarding screens.
    - **Fix:** Replace with structured `Logger` utility and ensure removal in production builds.

- [x] **D.3 Magic Numbers Refactoring**
    - **Problem:** Hardcoded confidence scores (30, 50, 95) and logic thresholds in `MonkModeService.ts`.
    - **Fix:** Extract to `src/config/constants.ts` or top-level constants.
    - **Implementation:** Extracted to top-level constants: `HEATMAP_THRESHOLDS`, `READER_TYPE_THRESHOLDS`, `DEFAULTS`, `MS_PER_DAY`, `SECONDS_PER_HOUR`. Updated all usages in MonkModeService.ts.

- [x] **D.5 God Component Refactoring (High Priority)**
    - **Problem:** Massive components handling mixed concerns (UI, State, API).
    - **Locations:**
        - `CreateCommitmentScreen.tsx` (1335→1008 lines, -24%)
        - `BookDetailScreen.tsx` (857→682 lines, -20%)
    - **Fix:** Extracted logic into 7 custom hooks.
    - **Implementation (2026-01-23):**
      - `useBookSearch.ts`: 検索ロジック (ISBN + Google Books API)
      - `useCommitmentForm.ts`: フォーム状態 + Reanimatedアニメーション + cancelAnimationバグ修正
      - `useContinueFlow.ts`: Continue Flow初期化 + isMountedガード
      - `useManualBookEntry.ts`: 手動入力ロジック
      - `useBookCommitmentDetail.ts`: BookDetailデータ取得
      - `useTagManagement.ts`: タグ操作
      - `useMemoEditor.ts`: メモ編集
    - **Shared Types:** `src/types/commitment.types.ts` (Currency, GoogleBook, ManualBook)

- [x] **D.6 Legacy Library Replacement**
    - **Problem:** `react-native-confetti-cannon` is likely unmaintained and may conflict with New Architecture.
    - **Fix:** Replaced with custom `ConfettiEffect` component using pure `react-native-reanimated` (60 particles, physics-based).
    - **Implementation (2026-01-23):**
      - `src/components/ConfettiEffect.tsx`: 60パーティクル物理シミュレーション
      - 単一SharedValue駆動、形状3種(正方形/長方形/円)、重力+サイン波揺れ
      - `VerificationSuccessModal.tsx` で宣言的API (`visible` prop) に変更
      - `react-native-confetti-cannon` 完全削除

- [x] **D.7 File Naming Consistency**
    - **Problem:** Inconsistent folder naming conventions in `src/components`.
    - **Locations:** `halloffame` (lowercase) vs `reading-dna` (kebab-case) vs `BookDetailSkeleton.tsx` (PascalCase).
    - **Fix:** Standardize all component folders to kebab-case (e.g., `hall-of-fame`) or PascalCase to match React conventions.

- [ ] **D.8 Type Definition Consistency**
    - **Problem:** Manual types in `src/types/index.ts` duplicate `database.types.ts`.
    - **Risk:** Schema changes not reflecting in app code, leading to runtime errors.
    - **Fix:** Refactor `src/types/index.ts` to export types derived directly from `Database['public']['Tables']`.

### Level 4: Improvement (UX/Performance) - 品質向上
- [ ] **I.1 Optimized Data Fetching**
    - **Problem:** `DashboardScreen` re-fetches data on every focus (`useFocusEffect`), causing lag and network waste.
    - **Fix:** Implement `React Query` or simple cache invalidation strategy.

- [ ] **I.2 Error Handling UX**
    - **Problem:** Over-reliance on blocking `Alert.alert` for minor errors.
    - **Fix:** Transition to non-blocking Toast notifications or inline error messages.

- [x] **I.3 Accessibility (a11y) Implementation**
    - **Problem:** No `accessibilityLabel` or `accessibilityRole` found. App is unusable for VoiceOver users.
    - **Fix:** Add a11y props to all interactive elements (`CommitmentCard`, Buttons, Inputs).
    - **Implementation:** Added accessibilityRole, accessibilityLabel, accessibilityState to PrimaryButton, SecondaryButton, OrangeButton, CommitmentCard, OnboardingLayout, BarcodeScannerModal, AuthScreen. Added accessibility i18n keys to all locales.

- [x] **P.6 List Performance Anti-pattern**
    - **Problem:** Using array index as `key` in lists.
    - **Locations:** `src/screens/onboarding/OnboardingScreen11.tsx`, `OnboardingScreen9.tsx`.
    - **Risk:** Performance degradation and state bugs when list items change order.
    - **Fix:** Use stable unique IDs for keys.
    - **Implementation:** Added `id` field to FEATURES and TESTIMONIALS arrays, updated map to use `feature.id` and `testimonial.id` as keys.

- [ ] **P.8 Unawaited Promises in Loops**
    - **Problem:** `secureUrls.map(async ...)` in `useImageColors.ts` creates unhandled promises.
    - **Risk:** Potential race conditions or unhandled rejections.
    - **Fix:** Wrap in `Promise.all()` or use `for...of` loop.

### Level 5: Store Compliance & Production Polish (審査対策) - 公開前提
- [x] **C.1 Permission String Localization (Guideline 5.1.1)**
    - **Problem:** `app.json` permission strings (`photosPermission`, etc.) are hardcoded in Japanese.
    - **Risk:** Rejection for non-localized permission requests on English devices.
    - **Fix:** Use `expo-localization` or update `app.config.ts` to support multi-language strings or use English as default.

- [x] **C.2 Offline Handling (Robustness)**
    - **Problem:** No `NetInfo` usage detected. App may crash or hang offline.
    - **Fix:** Implement `useNetInfo` hook and show a "No Connection" blocking UI or Toast to prevent API calls.
    - **Implementation:** `OfflineContext.tsx` + `OfflineBanner.tsx` with Reanimated animations.

- [x] **C.3 In-App Legal View (UX/Compliance)**
    - **Problem:** Terms/Privacy links open in external browser (Safari/Chrome).
    - **Risk:** Poor UX and potential App Store rejection (Reviewers prefer in-app).
    - **Fix:** Use `expo-web-browser` to open legal docs in `SFSafariViewController` / `CustomTabs`.

- [x] **P.1 Keyboard Avoidance (UX)**
    - **Problem:** `CreateCommitmentScreen` and `VerificationScreen` lack `KeyboardAvoidingView`.
    - **Risk:** Input fields and submit buttons blocked by keyboard.
    - **Fix:** Wrap all form screens in `KeyboardAvoidingView` with platform-specific behavior.
    - **Implementation:** Added KeyboardAvoidingView with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.

- [x] **P.2 Image Caching & Performance**
    - **Problem:** Standard `<Image />` component used in 15 locations (Lists, Verify).
    - **Risk:** High bandwidth usage, flickering, and potential memory leaks in lists.
    - **Fix:** Replace all `<Image />` with `expo-image` for caching and performance.
    - **Implementation:** Installed `expo-image`, updated 8 files with `contentFit`, `transition`, `cachePolicy`. Kept react-native Image for 2 files using `blurRadius` (not supported by expo-image).

- [x] **P.3 Alert API Standardization**
    - **Problem:** `alert()` (Web API) used in `src/screens/BookDetailScreen.tsx`.
    - **Fix:** Replace with `Alert.alert()` for consistent native behavior.
    - **Implementation:** Changed to `Alert.alert(i18n.t('common.error'), i18n.t('bookDetail.memo_update_failed'))`.

- [x] **P.4 Unit Testing Foundation**
    - **Problem:** Zero test files found. Critical business logic is untested.
    - **Fix:** Setup `jest` and add unit tests for `commitmentHelpers.ts` and `MonkModeService`.
    - **Implementation:** Installed jest-expo, created jest.config.js, jest.setup.js, jest.env.setup.js. Added 15 tests for commitmentHelpers (calculateSliderStartPage, calculateSuggestedDeadline, calculatePageRangesForAll, groupCommitmentsByBook). All tests passing.

- [x] **P.5 Forced Dark Theme (Design Integrity)**
    - **Problem:** `app.json` is set to `userInterfaceStyle: "light"`.
    - **Risk:** Titan Design (Dark UI) breaks on Light Mode devices (white status bars, system dialogs).
    - **Fix:** Set `userInterfaceStyle: "dark"` in `app.json` and force dark status bar.

### Level 6: Advanced Architecture & Stability (最終監査)
- [x] **S.4 Reaper Idempotency Hardening (CRITICAL)**
    - **Problem:** `process-expired-commitments` creates Stripe PaymentIntents without `idempotencyKey`.
    - **Risk:** **DOUBLE CHARGE RISK.** If the function times out or runs concurrently, the same user could be charged multiple times for one commitment.
    - **Fix:** Update `stripe.paymentIntents.create` to include `{ idempotencyKey: 'penalty_' + chargeId }`.

- [x] **S.5 Date/Time Integrity (Timezone Bomb)**
    - **Problem:** `new Date()` (Device Local Time) mixed with Server UTC timestamps in critical logic.
    - **Risk:** Deadline mismatches (e.g., user passes deadline locally but server says active), or cheating by changing device time.
    - **Fix:** Standardize all time logic to UTC using a library like `date-fns` or strict `ISOString` comparison.
    - **Implementation:** Created `src/lib/DateUtils.ts` with `getNowUTC()`, `getTodayUTC()`, `getYesterdayUTC()`. Refactored `MonkModeService.ts` and `commitmentHelpers.ts`.

- [x] **S.6 Dependency Consistency (Edge Functions)**
    - **Problem:** Stripe SDK version mismatch (`admin-actions` uses v14, `reaper` uses v17).
    - **Risk:** Inconsistent API behavior or type errors when handling payment objects.
    - **Fix:** Unify all Edge Functions to use the same Stripe SDK version (v17).
    - **Implementation:** Updated `admin-actions/index.ts` to use `stripe@17` with `apiVersion: '2025-12-15.clover'` and `getStripe()` lazy initialization pattern.

- [x] **S.7 Upload Security (File Bomb)**
    - **Problem:** `VerificationScreen` uploads images without checking file size.
    - **Risk:** Bandwidth exhaustion and storage abuse (DoS risk).
    - **Fix:** Check `asset.fileSize` before upload and limit to 5MB.
    - **Implementation:** Changed state from URI string to `ImagePickerAsset`, added 5MB validation before upload.

- [x] **S.8 Deep Link Validation**
    - **Problem:** `Linking.openURL` lacks pre-check and error feedback.
    - **Risk:** Silent failures or handling of malicious schemes.
    - **Fix:** Use `Linking.canOpenURL` and show Toast on failure.
    - **Implementation:** Created `src/utils/linkingUtils.ts` with `safeOpenURL` and `openAppStore` functions. Updated all screens using Linking.openURL (SettingsScreen, ForceUpdateScreen, CardRegistrationBanner, DonationAnnouncementModal, RoleSelectScreen).

- [x] **A.1 Granular Error Boundaries**
    - **Problem:** Global ErrorBoundary only. One screen crash breaks the entire app.
    - **Fix:** Implement sub-boundaries for MainTabs and critical screens.
    - **Implementation (2026-01-19):**
      - `src/components/TabErrorBoundary.tsx`: Error boundary with tab-specific error UI
      - All 4 tab navigators (HomeStack, MonkModeStack, LibraryStack, SettingsStack) wrapped
      - Logs errors with tab name context for debugging
      - i18n support for error messages (ja/en/ko)
    - **DoD:** One tab crash does not break other tabs. ✅

- [x] **A.2 Sentry Capture Consistency Audit**
    - **Problem:** 90+ `catch` blocks, but many only `console.error`.
    - **Fix:** Ensure `Sentry.captureException(error)` is present in all critical API and logic failures.
    - **Implementation:** Added `captureError` and `captureWarning` helper functions to `src/utils/errorLogger.ts`. Updated commitmentHelpers.ts, MonkModeService.ts, NotificationService.ts with proper Sentry reporting.

- [x] **A.3 Provider Optimization**
    - **Problem:** `OnboardingAtmosphereProvider` wraps the entire app, causing root re-renders on every atmosphere change.
    - **Fix:** All 5 Context Providers (Language, Offline, Analytics, OnboardingAtmosphere, Unread) now use `useMemo` for value objects.
    - **Implementation (2026-01-23):** Added `useMemo` wrapping to prevent unnecessary consumer re-renders.

- [x] **A.4 Async Safety & Cleanup**
    - **Problem:** Unawaited promises and `.then()` chains in `useEffect` (e.g., `LanguageContext`, `OnboardingScreen0`) without cleanup.
    - **Risk:** Memory leaks and "Can't perform state update on unmounted component" errors.
    - **Fix:** Added `isMounted` cleanup flags to async `useEffect` hooks.
    - **Implementation (2026-01-23):** `LanguageContext.tsx` and `OnboardingScreen0_Welcome.tsx` now guard setState calls with `isMounted` flag.

- [x] **P.9 Context Memoization**
    - **Problem:** Context provider values not memoized across 5 providers.
    - **Risk:** Unnecessary re-renders of all consuming components on every state update.
    - **Fix:** Wrapped all context values in `useMemo` with proper dependency arrays.
    - **Implementation (2026-01-23):** LanguageContext, OfflineContext, AnalyticsContext (both providers), OnboardingAtmosphereContext, UnreadContext.

- [ ] **P.10 Missing Indexes (Database Performance)**
    - **Problem:** `commitments` table lacks indexes on foreign keys (`user_id`, `book_id`) and status.
    - **Risk:** Full table scans causing slow dashboard loading as data grows.
    - **Fix:** Create a migration to add indexes for common query patterns.
    - **Implementation:** Created `20260114200000_add_missing_indexes.sql` with 9 indexes on commitments (user_id, book_id, status, user_status composite), verification_logs (commitment_id, created_at), tags (user_id), book_tags (tag_id, commitment_id).

---

## 🟢 Post-Release (Backlog)

**Objective:** Continuous improvement of UX and trust.

- [ ] **Improve Social Login Consent UX**
    - **Status:** Added to Backlog (Post-Release)
    - **Priority:** Medium (UX Trust Improvement)
    - **Problem:** Currently, the iOS permission dialog says "Sign in with supabase.com", which might confuse some users compared to native app experiences.
    - **Solution Candidates:**
        - **Plan A (Easy):** Enable Supabase Custom Domain (e.g., auth.commit-app.com). Requires Pro Plan.
        - **Plan B (Native):** Migrate to `react-native-google-signin` (Native SDK) to bypass the browser consent modal entirely.
    - **Timing:** Phase 2 (After initial user acquisition).

---

**Final Deep Dive Audit (Money & Privacy):**
- **💰 Money (Billing Safety):** 🚨 **CRITICAL FIX NEEDED.** The Reaper logic is missing the Stripe `idempotencyKey`. While the database prevents duplicate records, a network timeout during the Stripe call could lead to a double charge. Fixing **S.4** is mandatory before launch.
- **🔒 Privacy (PII):** ✅ **CLEAN.** No leaked emails or personal data found in logs/Sentry. RLS policies strictly enforce data isolation.
- **🔑 Security (Secrets):** ✅ **CLEAN.** No Secret Keys found in client bundles.
- **Verdict:** Fix **S.4**, and the service is safe to operate.

### Level 6.1: Codebase Audit (2026-01-21) - 厳重監査
**Objective:** Comprehensive audit revealed 56+ issues. Phase 1 (CRITICAL) complete, Phase 2/3 pending.

- [x] **AUDIT.1 Edge Function JSON Parse Hardening**
    - **Problem:** `req.json()` called without try-catch, crashes on invalid JSON
    - **Fix:** Wrapped in try-catch, returns 400 INVALID_REQUEST
    - **Files:** `use-lifeline/index.ts`, `isbn-lookup/index.ts`

- [x] **AUDIT.2 Edge Function Environment Variable Validation**
    - **Problem:** `Deno.env.get()` results not validated, empty strings cause cryptic errors
    - **Fix:** Added null/empty check before createClient, returns 500 CONFIGURATION_ERROR
    - **Files:** `process-expired-commitments/index.ts`

- [x] **AUDIT.3 Stripe Initialization Pre-validation**
    - **Problem:** `getStripe()` called inside try-catch for refunds, but failure message unclear
    - **Fix:** Pre-validate Stripe config before any DB changes, returns 500 STRIPE_NOT_CONFIGURED
    - **Files:** `admin-actions/index.ts`

- [x] **AUDIT.4 FunctionsHttpError Type Check**
    - **Problem:** `error.context` accessed without verifying error type
    - **Fix:** Added `instanceof FunctionsHttpError` check before accessing context
    - **Files:** `CreateCommitmentScreen.tsx`

- [x] **AUDIT.5 useFocusEffect Dependency Documentation**
    - **Problem:** Empty dependency array triggers ESLint warning, intention unclear
    - **Fix:** Added explanatory comment and ESLint disable directive
    - **Files:** `DashboardScreen.tsx`

- [x] **AUDIT.6 Phase 2 HIGH Issues (25 items)** - ✅ 完了 (2026-01-21)
    - **Phase 2A:** Edge Functions軽微修正 (7ファイル) - 環境変数検証、JSONパースエラーハンドリング
    - **Phase 2B:** Sentry統合 (15ファイル) - `captureError`追加
    - **Phase 2C:** DBインデックス最適化 (6件) - commitments, penalty_charges
    - **Phase 2D:** 型定義整合性修正 - User, Commitment, 新規6インターフェース
    - **Commit:** `896bf363`
- [x] **AUDIT.7 Phase 3 MEDIUM Issues (24+ items)** - ✅ 完了＆検証済 (2026-01-21)
    - **Batch 1:** Supabaseクエリ修正 (5箇所) - `.single()` → `.maybeSingle()`
    - **Batch 2:** 型安全性改善 (6箇所) - `DateTimePickerEvent`型、型安全なerror handling
    - **Batch 3:** console.error削除 (9箇所) - captureError重複箇所
    - **E2Eテスト:** 8シナリオ全パス (AuthScreen, DashboardScreen, BookDetailScreen, CreateCommitmentScreen, NotificationSettingsScreen, CommitmentDetailScreen, SettingsScreen, commitmentHelpers)

- [x] **AUDIT.8 Phase 4 新機能品質監査 (7 items)** - ✅ 完了＆デプロイ済 (2026-01-22)
    - **CRITICAL:** Web Portal職種定義修正 (`finance/executive` → `cs/founder`)
    - **HIGH:** send-push-notification JSON parse try-catch追加
    - **HIGH:** job-recommendations limit検証 (1-100範囲) 追加
    - **MEDIUM:** OnboardingScreen1_5 captureError追加
    - **MEDIUM:** WidgetService console.log削除 (7箇所)
    - **MEDIUM:** JobRecommendations FunctionsHttpError処理追加
    - **LOW:** admin-actions Optimistic Lock追加 (race condition防止)

### Level 6: Security & Backend Consistency (バックエンド監査)
- [ ] **S.1 Edge Function Security Verification**
    - **Status:** ✅ **Robust**.
    - **Findings:**
        - `send-push-notification`, `process-expired-commitments`: Uses `verifySystemAuthorization` with `timingSafeEqual` (Prevent Timing Attacks).
        - `admin-actions`: Checks `ADMIN_EMAILS` whitelist.
        - `create-commitment`, `use-lifeline`: Correctly validates User JWT.
    - **Action:** Document this security model in `docs/SECURITY.md` for future reference.

- [ ] **S.2 ISBN Lookup Rate Limiting**
    - **Observation:** `isbn-lookup` is public.
    - **Risk:** Potential abuse of Google Books API quota.
    - **Mitigation:** Consider adding IP-based rate limiting or CAPTCHA if abuse is detected.

- [ ] **S.3 Sentry Sampling & Scoping**
    - **Problem:** `tracesSampleRate: 0.1` vs `CLAUDE.md` mandate (100%). ErrorBoundary scope needs verification.
    - **Fix:** Adjust sample rate for launch (1.0) and verify ErrorBoundary wraps all Context Providers.

- [x] **W.4 i18n Key Consistency Audit**
    - **Problem:** Inconsistent keys between `en`, `ja`, `ko` (e.g., `monkmode.minutes_unit`).
    - **Risk:** Missing translations in production.
    - **Fix:** Sync all keys and remove `defaultValue` usage.
    - **Implementation:** Added 3 missing keys to ko.json (`common.unknown_author`, `common.coming_soon`, `profile.monthly_reading_trend`). Removed duplicate `scanner` keys from all locale files (kept the more complete definition).
    - **Phase 2 Fix (2026-01-15):** Merged duplicate `book_search` sections in `ja.json` and `en.json`. Added 4 missing keys to `ko.json` (`advanced_search`, `simple_search`, `title_placeholder`, `author_placeholder`).

- [ ] **W.5 Supabase Metadata Sync**
    - **Problem:** `database.types.ts` has `never` for Views/Functions.
    - **Fix:** Regenerate types to reflect current DB schema completely.

- [ ] **D.4 UI Timer Interpolation**
    - **Problem:** `useMonkModeTimer` relies on 1s interval, risking skipped seconds under load.
    - **Fix:** Implement `requestAnimationFrame` or drift-correction logic.

---

## 🚀 Release Status (2026-02-02)

**Target: App Store提出 2/9-2/15**
**対象市場:** 日本・英語圏（韓国語は v1.1）

### ✅ 完了済み (Phase 1-4.12 + IAP + セキュリティ監査修正)

| カテゴリ | 項目 | 状態 | 備考 |
|----------|------|------|------|
| **認証** | Google Sign-In | ✅ | Build #61成功 (iOS Client IDタイポ修正) |
| **認証** | Apple Sign-In | ✅ | ネイティブ認証実装 |
| **認証** | Email認証 | ✅ | Supabase Auth |
| **IAP** | IAPService.ts | ✅ | expo-in-app-purchases統合 |
| **IAP** | OnboardingScreen13_Paywall | ✅ | 購入フロー実装 |
| **IAP** | verify-iap-receipt | ✅ | Edge Function デプロイ済み + タイムアウト追加 |
| **IAP** | apple-iap-webhook | ✅ | JWS署名検証 + 冪等性実装 |
| **IAP** | App Store Connect商品 | ✅ | yearly/monthly登録済み |
| **DB** | RLSポリシー | ✅ | 全テーブル監査完了 |
| **DB** | apple_notifications_processed | ✅ | Webhook冪等性用テーブル |
| **Secrets** | Supabase Secrets | ✅ | APPLE_APP_SHARED_SECRET含む全設定 |
| **Secrets** | EAS Secrets | ✅ | 11シークレット設定済み |
| **Assets** | アプリアイコン | ✅ | 2048x2048 PNG |
| **コンテンツ** | App Store説明文 | ✅ | 日本語/英語準備済み |

---

### ✅ CRITICAL セキュリティ修正 (2026-02-02 完了)

技術監査で発見されたCRITICAL/HIGH問題を提出前に全て修正完了。

| ID | 問題 | 修正内容 | コミット |
|----|------|----------|----------|
| **CRITICAL-1** | apple-iap-webhook JWS署名検証なし | x5c証明書チェーンで署名検証実装 | `aebddbe8` |
| **CRITICAL-2** | apple-iap-webhook 冪等性なし | `apple_notifications_processed`テーブル + notificationUUID重複チェック | `aebddbe8` |
| **CRITICAL-3** | OnboardingScreen13 タイムアウト処理 | タイムアウト時にreturnで続行禁止、リトライ促進 | `aebddbe8` |
| **CRITICAL-4** | IAPService purchaseListener | 空results処理、DEFERREDケース対応、全エラーonError呼出 | `aebddbe8` |
| **CRITICAL-5** | subscription_status二重更新 | handleWarpCompleteはonboarding_completedのみ更新 | `aebddbe8` |
| **CRITICAL-6** | send-push-notification JSON parse | Expo Push APIレスポンスにtry-catch追加 | `aebddbe8` |
| **HIGH-1** | Safety Timer 5秒は短すぎ | 8秒に延長 + isMountedチェック | `aebddbe8` |
| **HIGH-4** | verify-iap-receipt タイムアウト | AbortControllerで10秒タイムアウト追加 | `aebddbe8` |

**デプロイ状況:**
- ✅ DB Migration適用済み: `20260202120000_add_apple_notifications_processed.sql`
- ✅ Edge Functions再デプロイ済み: `apple-iap-webhook`, `verify-iap-receipt`, `send-push-notification`

---

### 🔴 CRITICAL - 提出ブロッカー (残り)

#### C1. Stripe本番キー設定
- [ ] Stripe Dashboard → 本番キー取得
- [ ] Supabase: `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`
- [ ] EAS: `eas secret:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_live_...`
- [ ] Vercel: `printf '%s' 'pk_live_...' | npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production`
- [ ] Web Portal再デプロイ: `npx vercel --prod --yes`

#### C2. プロダクションビルド
- [ ] `eas build --profile production --platform ios`
- [ ] TestFlight最終動作確認

---

### 🟠 HIGH - App Store Connect設定 (手動作業)

#### H1. アプリ情報
- [ ] アプリ名: `COMMIT` (確定済み)
- [ ] サブタイトル: `積読を資産に変える読書コミットアプリ`
- [ ] プライマリカテゴリ: 書籍 (Books)
- [ ] セカンダリカテゴリ: 教育 (Education)

#### H2. スクリーンショット (必須)
- [x] 6.7インチ (iPhone 15 Pro Max)
- [x] 6.5インチ (iPhone 14 Plus)
- [x] 12.9インチ iPad (supportsTablet=true)

#### H3. App Privacy申告
- [ ] 収集データ: メール、ユーザーID、使用状況、診断
- [ ] データ使用目的: アプリ機能、分析

#### H4. IAP Server Notifications (Webhook)
- [ ] Production URL設定:
  ```
  https://rnksvjjcsnwlquaynduu.supabase.co/functions/v1/apple-iap-webhook
  ```

#### H5. 年齢制限アンケート
- [ ] 課金あり: はい
- [ ] 暴力/性的/ギャンブル: なし

---

### 🟡 MEDIUM - テスト

#### M1. IAP サンドボックステスト
- [ ] サンドボックステスターアカウント作成
- [ ] TestFlightで購入フロー確認
- [ ] 購入成功 → subscription_status更新確認

#### M2. 実機マルチデバイステスト
- [ ] iPhone SE (小画面)
- [ ] iPhone 14/15 (標準)
- [ ] iPhone 15 Pro Max (大画面)
- [ ] iPad (タブレット)

#### M3. 言語別テスト
- [ ] 日本語設定
- [ ] 英語設定

---

### 📝 提出手順

1. **Stripe本番キー設定** → C1完了
2. **App Store Connect設定** → H1-H5完了
3. **Production ビルド** → `eas build --profile production --platform ios`
4. **提出** → `eas submit --platform ios`
5. **審査待ち** → 通常1-2日

---

### 🔧 ファイルリファレンス

| 項目 | パス |
|------|------|
| IAP Service | `src/lib/IAPService.ts` |
| Paywall画面 | `src/screens/onboarding/OnboardingScreen13_Paywall.tsx` |
| Receipt検証 | `supabase/functions/verify-iap-receipt/index.ts` |
| Webhook | `supabase/functions/apple-iap-webhook/index.ts` |
| 説明文(ja) | `scripts/screenshots/templates/app-store-description-ja.md` |
| 説明文(en) | `scripts/screenshots/templates/app-store-description-en.md` |
| アイコン | `assets/icon.png` (2048x2048) |

---

### 📊 ビルド履歴

| Build | 状態 | 内容 |
|-------|------|------|
| #42-56 | ❌ | Google Sign-In様々な試行 |
| #57-60 | ❌ | OAuth環境変数修正済みだがタイポ残存 |
| #61 | ✅ | iOS Client IDタイポ修正で解決 |
| #62 | ⏳ | Production build (App Store提出用) |
