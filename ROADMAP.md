# Agentic Roadmap: COMMIT App

This roadmap is designed for **Autonomous AI Agents (Claude Code)**.
Do **NOT** skip steps. Do **NOT** combine tasks unless explicitly instructed.
Each task is atomic, role-specific, and has a clear definition of done.

---

## 🟢 Phase 1: Interactive Core Components

**Objective:** Implement high-quality, animated interactive components for the commitment creation flow.

- [x] **1.1 Interactive Slider (Page Count)**
    - **Role:** `[Frontend Specialist]`
    - **Action:** Create `src/components/AnimatedPageSlider.tsx`.
    - **Details:**
        - Implement drag gestures using `react-native-gesture-handler`.
        - Use `useSharedValue` and `useAnimatedStyle` for smooth 60fps animations.
        - Add haptic feedback on value changes using `expo-haptics`.
    - **DoD:** Component handles gestures smoothly and provides tactile feedback.

- [x] **1.2 Amount Setting (Penalty)**
    - **Role:** `[Frontend Specialist]`
    - **Action:** Create `src/components/PenaltyAmountInput.tsx` and integrate into `CreateCommitmentScreen`.
    - **Details:**
        - **Component:** Create a standalone component that takes `amount` and `onAmountChange`.
        - **Vignette Effect:** Use `expo-linear-gradient` inside an `Animated.View`. Interpolate opacity based on amount (0 to max). Darken corners visually.
        - **Pulse Animation:** Use `react-native-reanimated` (`withRepeat`, `withSequence`) on the "Set Pledge" button to simulate a heartbeat.
        - **Haptics:** Trigger impact on significant amount increments.
        - **Trust UI:** Add a clear disclaimer text explicitly stating: *"No immediate charge. You pay ONLY if you miss the deadline."* to reduce user anxiety.
    - **DoD:** Functional amount input with visible darkening effect and pulsating button.

- [x] **1.3 Quick Continue Flow**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Enable "Continue Reading" flow from history or completion screen.
    - **Details:**
        - **Routing:** Updated `CreateCommitmentScreen` to accept optional `continueBookId` param.
        - **Logic:** If `continueBookId` is present, fetches book details and progress from Supabase, skips the "Search Book" step, sets slider `minValue` to (totalPagesRead + 1), and pre-fills settings from last commitment.
        - **UI:** Added "Continue this Book" button to `CommitmentDetailScreen` (shown for ALL statuses: pending, completed, defaulted).
        - **Target Pages Display:** `CommitmentDetailScreen` now shows the target page count for each commitment.
        - **Smart Slider:** `AnimatedPageSlider` respects dynamic `minValue` prop. User cannot set goals overlapping with previously read pages.
        - **Validation:** Added validation to prevent submitting `target_pages` <= `totalPagesRead`.
        - **Helper Functions:** Created `src/lib/commitmentHelpers.ts` with `getBookProgress`, `getBookById`, `calculateSliderStartPage`, `calculateSuggestedDeadline`.
    - **DoD:** Tapping "Continue" on any commitment immediately starts a new commitment creation for the same book without searching, with progress-aware defaults. Slider starts from the next unread page.

- [x] **1.4 UX Overhaul - Group Commitments, Enhance Card UI & Verification Flow**
    - **Role:** `[UX Engineer]`
    - **Action:** Group commitments by book, improve card feedback, and upgrade verification UX.
    - **Details:**
        - **Dashboard:** Group active commitments by `book_id`. Display page ranges (e.g., "pp. 656 - 984") and stack effects.
        - **Verification Screen:** Implement a "Before/After/Action" reflection framework with guided placeholders to help users meet the 100-character limit meaningfully.
        - **Success Modal:**
            - Display randomized motivational messages (5 variations) to reinforce achievement.
            - Offer dual "Next Steps": "Continue this Book" (same book) AND "Select Next Book" (new book).
        - **Sorting:** Ensure the Dashboard list is sorted by most recently updated.
    - **DoD:** Dashboard is organized. Verification prompts deep reflection. Success modal drives immediate retention via "Next Action" buttons.

- [x] **1.5 Completion Celebration (The Reward)**
    - **Role:** `[Animation Specialist]`
    - **Action:** Implemented a celebration effect upon marking a commitment as complete.
    - **Details:**
        - Created `VerificationSuccessModal` component with `react-native-confetti-cannon` for confetti explosion.
        - Used `react-native-reanimated` for spring animations and scale effects.
        - Implemented "Money Saved" counter animation (ticking up from ¥0 to pledge amount).
        - Modal includes localized success messages (en/ja/ko) and "Return to Dashboard" button.
    - **DoD:** Completing a commitment triggers a visible, exciting animation with confetti and money saved counter.

- [ ] **1.6 Fix UI Flicker during Login Flow**
    - **Role:** `[Core Engineer]`
    - **Action:** Stabilize auth state management to prevent login screen flashes.
    - **Details:**
        - **Auth Guard:** Implement a unified `isLoading` state in `AppNavigator` that waits for BOTH Supabase session and subscription check.
        - **Debug:** Investigate and fix the `SIGNED_IN -> SIGNED_OUT -> SIGNED_IN` event sequence.
        - **Splash:** Keep the splash screen or a dedicated loading view visible until the final route is determined.
    - **DoD:** Login transition is smooth with no intermediate screen flashes. The user lands directly on the Dashboard.

---

## 🟡 Phase 2: Release Blockers (Stabilization)

**Objective:** Ensure the app is stable, type-safe, and configurable before adding new features.

- [ ] **2.1 Environment & Configuration Safety**
    - **Role:** `[System Architect]`
    - **Action:** Create `src/config/env.ts` with strict validation.
    - **DoD:** App crashes immediately on boot if `.env` is broken.

- [ ] **2.2 Global Error Handling**
    - **Role:** `[React Component Dev]`
    - **Action:** Create `src/components/common/ErrorBoundary.tsx`.
    - **DoD:** Graceful failure UI instead of white screens.

- [ ] **2.3 Strict Type Definitions (Supabase)**
    - **Role:** `[TypeScript Expert]`
    - **Action:** Update `src/types/database.types.ts` and `src/lib/supabase.ts`.
    - **DoD:** No `any` types in data fetching.

- [ ] **2.4 Critical UI Edge Cases**
    - **Role:** `[UI Designer]`
    - **Action:** Polish `BookDetailScreen` loading state and `DashboardScreen` empty state.
    - **DoD:** UI feels responsive and inviting even with no data.

---

## 🔵 Phase 3: Polish & Animation

*To be detailed after Phase 2 completion.*