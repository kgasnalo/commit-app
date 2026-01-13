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

- [ ] **7.7 Internal Admin Dashboard (Ops)**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Simple Retool/Admin view for Support.
    - **DoD:** Ability to Refund/Complete commitments manually.

---

## 🛡️ Phase 8: Reliability, Ops & Analytics (Pro-Grade)

**Objective:** Monitoring, Automation, and Business Intelligence.

- [ ] **8.1 Crash & Error Monitoring (Sentry)**
    - **Role:** `[DevOps Engineer]`
    - **Action:** Integrate Sentry (App + Edge Functions).
    - **DoD:** Crash reports received in Sentry dashboard.

- [ ] **8.2 CI/CD Pipeline (GitHub Actions)**
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
