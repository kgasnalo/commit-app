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

### Phase 2.2: Act 2 - The Crisis (Screens 5-10)
- [x] **2.2.1 Screen 5 (Penalty):** Haptic Resistance Slider.
- [x] **2.2.2 Screen 7 (Opportunity Cost):** Burning Text Effect (Shader).

### Phase 2.3: Act 3 - The Covenant (Screens 11-15) ✅
- [x] **2.3.1 Screen 12 (The Plan):** Blueprint drawing animation.
- [x] **2.3.2 Screen 13 (The Paywall):** Slide-to-Commit interaction.
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

- [ ] **4.8 Review & Rating Strategy (Growth)**
    - **Role:** `[Product Manager]`
    - **Action:** Implement StoreKit In-App Review API.
    - **Trigger:** Prompt user for a rating ONLY after a "Positive Moment" (e.g., Successfully completing a commitment). Never prompt after a penalty.
    - **DoD:** App requests review at appropriate high-engagement moments.

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

- [ ] **6.7 Legal Consent Versioning (Compliance)**
    - **Role:** `[Backend Engineer]`
    - **Action:** Store `agreed_tos_version` in user profile.
    - **Logic:** If `app_tos_version > user_agreed_version`, force show a "Terms Updated" modal on launch blocking usage until agreed.
    - **DoD:** Infrastructure to force-renew consent when legal terms change.

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
    - **DoD:** Merge to `main` triggers auto-deployment.

- [ ] **8.3 Product Analytics (PostHog/Mixpanel)**
    - **Role:** `[Product Manager]`
    - **Action:** Track key user events (Commitment Created, Completed, Defaulted).
    - **DoD:** Dashboard shows "Commitment Completion Rate" and "Churn".

- [ ] **8.4 Remote Config & Force Update (The Kill Switch)**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Implement a check on app launch against Supabase/Edge Config.
    - **Logic:** If `current_app_version < min_required_version`, show a blocking modal: "Please update to continue" with a link to the App Store.
    - **Why:** To prevent crashes or exploits from old versions circulating.
    - **DoD:** Admin can force all users to update by changing a server-side value.

- [ ] **8.5 Maintenance Mode (Ops)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Global "Under Maintenance" switch in DB/Config.
    - **Logic:** If `maintenance_mode` is TRUE, the app shows a "We'll be back soon" screen instead of trying to fetch data and failing.
    - **DoD:** Can take the entire service offline gracefully for database migrations.

---

## 🛠️ 技術的負債と品質改善 (Technical Debt & Quality Improvements)

### Level 1: Critical (Hotfixes) - 即時対応必須
- [ ] **H.1 React 19 JSX Runtime Conflict Fix**
    - **Error:** `SyntaxError: Duplicate __self prop found` in `src/screens/CreateCommitmentScreen.tsx`.
    - **Cause:** React 19 (Automatic Runtime) conflicts with `babel-preset-expo` injecting `__self`.
    - **Fix:** Update `babel.config.js` presets to `['babel-preset-expo', { jsxRuntime: 'automatic' }]`.
    - **Status:** 🚨 **Critical Blocker** (App fails to bundle).

- [ ] **H.2 Deprecated SafeAreaView Replacement**
    - **Warning:** `SafeAreaView has been deprecated...`
    - **Scope:** `App.js`, `DashboardScreen.tsx`, and all screens using native `SafeAreaView`.
    - **Fix:** Replace with `SafeAreaView` from `react-native-safe-area-context`.

- [ ] **H.3 Hardcoded Strings (Localization Failures)**
    - **Problem:** Japanese text hardcoded in logic, bypassing i18n system.
    - **Locations:**
        - `src/screens/VerificationScreen.tsx` (Line 76: `defaultValue`)
        - `app.json` (`photosPermission` in Japanese)
    - **Risk:** App rejection or poor UX for non-Japanese users.
    - **Fix:** Move all strings to `src/i18n/locales/*.json`.

### Level 2: Warning (Refactoring) - バグの温床
- [ ] **W.1 Type Safety Enforcement**
    - **Problem:** Widespread use of `any` type and `as any` casting in navigation props and hooks.
    - **Locations:**
        - `src/screens/onboarding/*.tsx` (Almost all onboarding screens)
        - `src/screens/monkmode/MonkModeScreen.tsx`
        - `src/components/VerificationSuccessModal.tsx` (`useRef<any>`)
        - `src/screens/LibraryScreen.tsx`
    - **Risk:** Runtime errors due to missing/incorrect route params.
    - **Fix:** Implement strictly typed `StackScreenProps` for all screens.

- [ ] **W.2 Hardcoded Values & i18n Gaps**
    - **Problem:** Direct color codes (`#080604`, `#EC4899`) and strings mixed in UI logic.
    - **Locations:** `src/screens/BookDetailScreen.tsx` (TAG_COLORS), `src/theme/colors.ts`.
    - **Fix:** Move all colors to `src/theme` and enforce `i18n.t()` for all user-facing text.

- [ ] **W.3 Inline Styles Performance (16 locations)**
    - **Problem:** Usage of `style={{ ... }}` creates new objects on every render, causing unnecessary re-renders.
    - **Locations:**
        - `src/screens/RoleSelectScreen.tsx`
        - `src/components/AnimatedPageSlider.tsx`
        - `src/screens/monkmode/MonkModeScreen.tsx`
        - `src/screens/LibraryScreen.tsx` (and others)
    - **Fix:** Move all styles to `StyleSheet.create`.

### Level 3: Debt (Architecture) - メンテナンス性
- [ ] **D.1 DRY: Background Component Extraction**
    - **Problem:** Complex `Titan Background` logic (LinearGradients) duplicated across multiple screens.
    - **Fix:** Create reusable `TitanBackground` component.

- [ ] **D.2 Console Log Cleanup**
    - **Problem:** 200+ `console.log` calls remaining in production code.
    - **Locations:** `MetricsService.ts`, `MonkModeService.ts`, `LiveActivityService.ts`, `AppNavigator.tsx`, and Onboarding screens.
    - **Fix:** Replace with structured `Logger` utility and ensure removal in production builds.

- [ ] **D.3 Magic Numbers Refactoring**
    - **Problem:** Hardcoded confidence scores (30, 50, 95) and logic thresholds in `MonkModeService.ts`.
    - **Fix:** Extract to `src/config/constants.ts` or top-level constants.

- [ ] **D.5 God Component Refactoring (High Priority)**
    - **Problem:** Massive components handling mixed concerns (UI, State, API).
    - **Locations:**
        - `CreateCommitmentScreen.tsx` (>1080 lines)
        - `BookDetailScreen.tsx` (>840 lines)
    - **Fix:** Extract logic into custom hooks (e.g., `useBookDetails`, `useCommitmentCreation`) and sub-components.

- [ ] **D.6 Legacy Library Replacement**
    - **Problem:** `react-native-confetti-cannon` is likely unmaintained and may conflict with New Architecture.
    - **Fix:** Replace with `react-native-skia` particle system or a modern, maintained alternative.

- [ ] **D.7 File Naming Consistency**
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

- [ ] **I.3 Accessibility (a11y) Implementation**
    - **Problem:** No `accessibilityLabel` or `accessibilityRole` found. App is unusable for VoiceOver users.
    - **Fix:** Add a11y props to all interactive elements (`CommitmentCard`, Buttons, Inputs).

- [ ] **P.6 List Performance Anti-pattern**
    - **Problem:** Using array index as `key` in lists.
    - **Locations:** `src/screens/onboarding/OnboardingScreen11.tsx`, `OnboardingScreen9.tsx`.
    - **Risk:** Performance degradation and state bugs when list items change order.
    - **Fix:** Use stable unique IDs for keys.

- [ ] **P.8 Unawaited Promises in Loops**
    - **Problem:** `secureUrls.map(async ...)` in `useImageColors.ts` creates unhandled promises.
    - **Risk:** Potential race conditions or unhandled rejections.
    - **Fix:** Wrap in `Promise.all()` or use `for...of` loop.

### Level 5: Store Compliance & Production Polish (審査対策) - 公開前提
- [ ] **C.1 Permission String Localization (Guideline 5.1.1)**
    - **Problem:** `app.json` permission strings (`photosPermission`, etc.) are hardcoded in Japanese.
    - **Risk:** Rejection for non-localized permission requests on English devices.
    - **Fix:** Use `expo-localization` or update `app.config.ts` to support multi-language strings or use English as default.

- [ ] **C.2 Offline Handling (Robustness)**
    - **Problem:** No `NetInfo` usage detected. App may crash or hang offline.
    - **Fix:** Implement `useNetInfo` hook and show a "No Connection" blocking UI or Toast to prevent API calls.

- [ ] **C.3 In-App Legal View (UX/Compliance)**
    - **Problem:** Terms/Privacy links open in external browser (Safari/Chrome).
    - **Risk:** Poor UX and potential App Store rejection (Reviewers prefer in-app).
    - **Fix:** Use `expo-web-browser` to open legal docs in `SFSafariViewController` / `CustomTabs`.

- [ ] **P.1 Keyboard Avoidance (UX)**
    - **Problem:** `CreateCommitmentScreen` and `VerificationScreen` lack `KeyboardAvoidingView`.
    - **Risk:** Input fields and submit buttons blocked by keyboard.
    - **Fix:** Wrap all form screens in `KeyboardAvoidingView` with platform-specific behavior.

- [ ] **P.2 Image Caching & Performance**
    - **Problem:** Standard `<Image />` component used in 15 locations (Lists, Verify).
    - **Risk:** High bandwidth usage, flickering, and potential memory leaks in lists.
    - **Fix:** Replace all `<Image />` with `expo-image` for caching and performance.

- [ ] **P.3 Alert API Standardization**
    - **Problem:** `alert()` (Web API) used in `src/screens/BookDetailScreen.tsx`.
    - **Fix:** Replace with `Alert.alert()` for consistent native behavior.

- [ ] **P.4 Unit Testing Foundation**
    - **Problem:** Zero test files found. Critical business logic is untested.
    - **Fix:** Setup `jest` and add unit tests for `commitmentHelpers.ts` and `MonkModeService`.

- [ ] **P.5 Forced Dark Theme (Design Integrity)**
    - **Problem:** `app.json` is set to `userInterfaceStyle: "light"`.
    - **Risk:** Titan Design (Dark UI) breaks on Light Mode devices (white status bars, system dialogs).
    - **Fix:** Set `userInterfaceStyle: "dark"` in `app.json` and force dark status bar.

### Level 6: Advanced Architecture & Stability (最終監査)
- [ ] **S.4 Reaper Idempotency Hardening (CRITICAL)**
    - **Problem:** `process-expired-commitments` creates Stripe PaymentIntents without `idempotencyKey`.
    - **Risk:** **DOUBLE CHARGE RISK.** If the function times out or runs concurrently, the same user could be charged multiple times for one commitment.
    - **Fix:** Update `stripe.paymentIntents.create` to include `{ idempotencyKey: 'penalty_' + chargeId }`.

- [ ] **S.5 Date/Time Integrity (Timezone Bomb)**
    - **Problem:** `new Date()` (Device Local Time) mixed with Server UTC timestamps in critical logic.
    - **Risk:** Deadline mismatches (e.g., user passes deadline locally but server says active), or cheating by changing device time.
    - **Fix:** Standardize all time logic to UTC using a library like `date-fns` or strict `ISOString` comparison.

- [ ] **S.6 Dependency Consistency (Edge Functions)**
    - **Problem:** Stripe SDK version mismatch (`admin-actions` uses v14, `reaper` uses v17).
    - **Risk:** Inconsistent API behavior or type errors when handling payment objects.
    - **Fix:** Unify all Edge Functions to use the same Stripe SDK version (v17).

- [ ] **A.1 Granular Error Boundaries**
    - **Problem:** Global ErrorBoundary only. One screen crash breaks the entire app.
    - **Fix:** Implement sub-boundaries for MainTabs and critical screens (`CreateCommitment`, `Verification`).

- [ ] **A.2 Sentry Capture Consistency Audit**
    - **Problem:** 90+ `catch` blocks, but many only `console.error`.
    - **Fix:** Ensure `Sentry.captureException(error)` is present in all critical API and logic failures.

- [ ] **A.3 Provider Optimization**
    - **Problem:** `OnboardingAtmosphereProvider` wraps the entire app, causing root re-renders on every atmosphere change.
    - **Fix:** Use `memo` on `AppNavigator` or split context into static/dynamic parts.

- [ ] **A.4 Async Safety & Cleanup**
    - **Problem:** Unawaited promises and `.then()` chains in `useEffect` (e.g., `LanguageContext`, `OnboardingScreen0`) without cleanup.
    - **Risk:** Memory leaks and "Can't perform state update on unmounted component" errors.
    - **Fix:** Use `AbortController` or cleanup flags in all async `useEffect` hooks.

- [ ] **P.9 Context Memoization**
    - **Problem:** `OnboardingAtmosphereContext` provider value is not memoized.
    - **Risk:** Unnecessary re-renders of all consuming components on every state update.
    - **Fix:** Wrap `contextValue` in `useMemo`.

- [ ] **P.10 Missing Indexes (Database Performance)**
    - **Problem:** `commitments` table lacks indexes on foreign keys (`user_id`, `book_id`) and status.
    - **Risk:** Full table scans causing slow dashboard loading as data grows.
    - **Fix:** Create a migration to add indexes for common query patterns.

---

**Final Deep Dive Audit (Money & Privacy):**
- **💰 Money (Billing Safety):** 🚨 **CRITICAL FIX NEEDED.** The Reaper logic is missing the Stripe `idempotencyKey`. While the database prevents duplicate records, a network timeout during the Stripe call could lead to a double charge. Fixing **S.4** is mandatory before launch.
- **🔒 Privacy (PII):** ✅ **CLEAN.** No leaked emails or personal data found in logs/Sentry. RLS policies strictly enforce data isolation.
- **🔑 Security (Secrets):** ✅ **CLEAN.** No Secret Keys found in client bundles.
- **Verdict:** Fix **S.4**, and the service is safe to operate.

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

- [ ] **W.4 i18n Key Consistency Audit**
    - **Problem:** Inconsistent keys between `en`, `ja`, `ko` (e.g., `monkmode.minutes_unit`).
    - **Risk:** Missing translations in production.
    - **Fix:** Sync all keys and remove `defaultValue` usage.

- [ ] **W.4 i18n Key Consistency Audit**
    - **Problem:** Inconsistent keys between `en`, `ja`, `ko` (e.g., `monkmode.minutes_unit`).
    - **Risk:** Missing translations in production.
    - **Fix:** Sync all keys and remove `defaultValue` usage.

- [ ] **W.5 Supabase Metadata Sync**
    - **Problem:** `database.types.ts` has `never` for Views/Functions.
    - **Fix:** Regenerate types to reflect current DB schema completely.

- [ ] **D.4 UI Timer Interpolation**
    - **Problem:** `useMonkModeTimer` relies on 1s interval, risking skipped seconds under load.
    - **Fix:** Implement `requestAnimationFrame` or drift-correction logic.
