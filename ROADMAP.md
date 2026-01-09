# Agentic Roadmap: COMMIT App (Master Plan)

This roadmap is designed for **Autonomous AI Agents (Claude Code)** and Engineering Teams.
Do **NOT** skip steps. Do **NOT** combine tasks unless explicitly instructed.
Each task is atomic, role-specific, and has a clear definition of done.

**Status Update:**
- Phase 1-3: Core features stabilized.
- Phase 3.5 (MVP): Simplified User Profile (Username/Date) & Account Management.
- Phase 7: "Web Companion Model" for compliant payments.
- Phase 8: Ops, Reliability, and Analytics for continuous improvement.

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
    - **Design Note:** Removed "Continue this book" button from Commitment Detail to prevent goal conflicts. New commitments should only be created after completion or via a clear non-conflicting flow.

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

- [x] **1.8 The Lifeline (Emergency Freeze) ✅**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Implement "Fairness Valve" via Edge Function.
    - **Details:** One-time freeze **per Book** (not per commitment). Logic checks `book_id` history to prevent reuse on subsequent commitments for the same book.
    - **Implementation:**
      - Edge Function: `supabase/functions/use-lifeline/index.ts`
      - DB Column: `commitments.is_freeze_used` (boolean)
      - UI: Orange "Lifeline (+7 Days)" button in CommitmentDetailScreen
      - i18n: Keys added for ja/en/ko
    - **DoD:** User can extend deadline once per book; DB updates securely.

- [x] **1.9 Hyper Scanner (ISBN Barcode) ✅**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Integrate Camera for barcode scanning.
    - **Security:** Proxy Google Books API calls via Supabase Edge Function (`isbn-lookup`).
    - **Implementation:**
      - Component: `src/components/BarcodeScannerModal.tsx`
      - Edge Function: `supabase/functions/isbn-lookup/index.ts` (deployed with `--no-verify-jwt`)
      - Utilities: `src/utils/isbn.ts`
      - Integration: CreateCommitmentScreen + OnboardingScreen3
    - **Note:** `expo-camera` requires native rebuild (not Expo Go compatible). Run `npx expo run:ios/android`.
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
- [x] **2.3.1 Screen 12 (The Plan):** Blueprint drawing animation (`BlueprintCard.tsx`).
- [x] **2.3.2 Screen 13 (The Paywall):** Slide-to-Commit interaction (`SlideToCommit.tsx`).
- [x] **2.3.3 Screen 13→Dashboard (The Transition):** "007-Style" Cinematic Reveal (`CinematicCommitReveal.tsx`).
    - **Timeline:** Blackout (400ms) → Silence (500ms) → "COMMIT" fade-in (800ms) → Slow zoom 1.0→1.05 (2500ms) → Fade-out (500ms) → Dashboard fade-in (800ms).
    - **Typography:** Futura-Bold (iOS) / sans-serif-black (Android), letterSpacing: 4, pure white (#FFFFFF).
    - **Trigger:** `setShowWarpTransition(true)` in `OnboardingScreen13_Paywall.tsx` (NOT navigation).
    - **Dashboard Integration:** `DashboardScreen.tsx` reads `showDashboardFadeIn` AsyncStorage flag and fades in from black.

### Phase 2.4: Internationalization & UX Polish ✅ 🆕
- [x] **2.4.1 Language Instant Switching:** Settings language change immediately reflects across all screens.
    - `LanguageContext` (`src/contexts/LanguageContext.tsx`) manages language state.
    - `NavigationContainer` uses `key={language}` to force full remount on language change.
    - `SettingsScreen` uses `useLanguage()` hook.
- [x] **2.4.2 i18n Translation Sync:** All locale files (ja/en/ko) synchronized with missing keys.
- [x] **2.4.3 Cross-Tab Navigation Fix:** LibraryScreen → CreateCommitment uses proper nested navigation.

---

## 🟡 Phase 3: Release Blockers (Stabilization)

**Objective:** Ensure the app is stable, type-safe, and configurable.

- [x] **3.1 Environment & Configuration Safety**
- [x] **3.2 Global Error Handling**
- [x] **3.3 Strict Type Definitions (Supabase)**
- [x] **3.4 Critical UI Edge Cases**
- [x] **3.5 Engineering Standards: Localization & Layout 🆕**
    - **Rule 1 (Zero Hard-coding):** All strings (UI, Alerts, Placeholders) MUST use `i18n.t()`. No Japanese/English/Korean should be hard-coded in TSX.
    - **Rule 2 (Fluid Layouts):** Avoid fixed heights and absolute positioning that block text expansion. Use Flexbox `gap` and `padding`.
    - **Rule 3 (No defaultValues):** Do NOT use Japanese strings in `defaultValue`. Use the key only, or English if absolutely necessary.

---

## 👤 Phase 3.5: User Profile & Settings (The Control Room) 🆕

**Objective:** Essential account management for App Store compliance and user trust.

- [ ] **3.5.1 User Profile UI (MVP)**
    - **Role:** `[UI Designer]`
    - **Action:** Create `src/screens/ProfileScreen.tsx`.
    - **Details:** Simple display name (or Email) and "Member Since [Date]".
    - **Note:** Keep it minimal. No complex stats for V1.
    - **DoD:** User can see their identity and registration date.

- [ ] **3.5.2 Settings Navigation & Legal Links**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Implement Settings menu.
    - **Items:** "Manage Payment (Web)", "Terms", "Privacy", "Support".
    - **DoD:** Links open external Web Portal/pages correctly.

- [ ] **3.5.3 Account Deletion (Apple Requirement) 🚨**
    - **Role:** `[Backend Engineer]`
    - **Action:** Implement "Delete Account" via Edge Function.
    - **Logic:**
        1. Check for **Failed Payments**. If exists, BLOCK deletion with alert.
        2. If clean, DELETE Supabase Auth user + Profiles + Cancel Stripe Customer.
        3. Active commitments are abandoned (deleted) without penalty.
    - **DoD:** Irreversible deletion of all user data (unless debt exists).

- [ ] **3.5.4 Contact / Support Flow**
    - **Role:** `[Frontend Engineer]`
    - **Action:** "Contact Support" button (mailto or form link).
    - **DoD:** User can initiate a support request.

---

## 🔵 Phase 4: Engagement, Retention & Virality

**Objective:** Integrate world-class trends to keep users engaged.

- [ ] **4.1 Dynamic Pacemaker (Notifications)**
    - **Action:** Smart local notifications ("Read X pages today").
- [ ] **4.2 The Commitment Receipt**
    - **Action:** Receipt-style image generation for sharing.
- [ ] **4.3 Monk Mode**
    - **Action:** Strict focus timer with ambient sound.
- [ ] **4.4 Lock Screen Live Activity**
    - **Action:** iOS Dynamic Island widget.
- [ ] **4.5 Advanced Animation Polish**
    - **Action:** Refine all micro-interactions.
    - **Details:** Implement the "Hero Object" (Shared Element Transition).
- [ ] **4.6 Reading DNA**
    - **Action:** Visualize reading habits (Speed, Time).
- [ ] **4.7 The Hall of Fame**
    - **Action:** Netflix-style library for completed books.

---

## 🛠️ Phase 5: Technical Debt & Maintenance

- [ ] **5.1 Migrate Audio System**
    - **Action:** Update `expo-av` to `expo-audio` (SDK 54).

---

## 🏁 Phase 6: Release Preparation (Pre-launch Checklist)

**Objective:** Clean up shortcuts and ensure legal/platform compliance.

- [ ] **6.1 Remove Dev-only Auth Credentials**
- [ ] **6.2 Final Animation Quality Audit**
- [ ] **6.3 Production Environment Audit**
- [ ] **6.4 Final Build & Smoke Test**
- [ ] **6.5 App Store Guidelines Check 🆕**
    - **Role:** `[Product Owner]`
    - **Action:** Verify NO native payment screens for penalties. All must route to Web.
    - **DoD:** Compliance with Apple Guidelines 3.1.1 & 3.2.1.
- [ ] **6.6 Compliance (Launch Critical) 🆕**
    - **Role:** `[Legal/Product Owner]`
    - **Action:** Create Web Pages for: Terms of Service, Privacy Policy, Tokushoho (特商法).
    - **DoD:** Legal footer exists on Web Payment Portal.

---

## ⚙️ Phase 7: The Engine (Web Companion & Security) 🆕

**Priority: CRITICAL** (Concurrent with Phase 2/3)
**Objective:** Secure infrastructure for payments via Web Portal (Apple Compliance).

- [ ] **7.1 Web Payment Portal (Next.js)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Deploy minimal Vercel app sharing Supabase project.
    - **Features:** Login (Auth), Stripe Elements (Card Setup).
    - **DoD:** User can save credit card securely on the web.

- [ ] **7.2 Deep Linking & Handoff**
    - **Role:** `[Mobile Engineer]`
    - **Action:** App (Linking) <-> Web Redirects.
    - **Details:** Use **Magic Link Auth Handoff**. App requests one-time token -> Web auto-logins -> User sets card -> Redirects back to App.
    - **DoD:** Seamless flow without password re-entry.

- [ ] **7.3 Push Notification Infrastructure (Prerequisite)**
    - **Role:** `[Backend Engineer]`
    - **Action:** Setup Expo Push Notifications & Supabase Tables.
    - **DoD:** Server can send test notification to a specific user.

- [ ] **7.4 "The Reaper" (Automated Deadline Enforcer)**
    - **Role:** `[Backend Engineer]`
    - **Action:** `pg_cron` + Edge Function.
    - **Logic:**
        1. Hourly check for missed deadlines.
        2. Trigger Stripe Off-Session Charge.
        3. Use **Stripe Smart Retries** for failures.
        4. If payment fails (final), mark user as 'payment_failed' and **BLOCK new commitments**.
    - **DoD:** Automated penalty charge and protection against non-payment.

- [ ] **7.5 Row Level Security (RLS) Hardening**
    - **Role:** `[Security Engineer]`
    - **Action:** Lock down commitments table.
    - **Rules:** No DELETE, No UPDATE to 'completed' if deadline passed.

- [ ] **7.6 Server-side Validation**
    - **Action:** Validate amounts and page counts via Google Books API.

- [ ] **7.7 Internal Admin Dashboard (Ops)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Simple Retool/Admin view for Support.
    - **DoD:** Ability to Refund/Complete commitments manually.

---

## 🛡️ Phase 8: Reliability, Ops & Analytics (Pro-Grade) 🆕

**Objective:** Monitoring, Automation, and Business Intelligence.

- [ ] **8.1 Crash & Error Monitoring (Sentry)**
    - **Role:** `[DevOps Engineer]`
    - **Action:** Integrate Sentry (App + Edge Functions).
    - **DoD:** Crash reports received in dashboard.

- [ ] **8.2 CI/CD Pipeline (GitHub Actions)**
    - **Role:** `[DevOps Engineer]`
    - **Action:** Automate build (EAS) and deploy (Edge Functions).
    - **DoD:** Merge to main triggers auto-deployment.

- [ ] **8.3 Product Analytics (PostHog/Mixpanel) 🆕**
    - **Role:** `[Product Manager]`
    - **Action:** Track key user events (Commitment Created, Completed, Defaulted).
    - **DoD:** Dashboard shows "Commitment Completion Rate" and "Churn".
