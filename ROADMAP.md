# Agentic Roadmap: COMMIT App

This roadmap is designed for **Autonomous AI Agents (Claude Code)**.
Do **NOT** skip steps. Do **NOT** combine tasks unless explicitly instructed.
Each task is atomic, role-specific, and has a clear definition of done.

---

## 🟢 Phase 1: Interactive Core Components & Fairness

**Objective:** Implement high-quality, animated interactive components and ensure the commitment logic is fair and robust.

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

- [x] **1.6 Fix UI Flicker during Login Flow**
    - **Role:** `[Core Engineer]`
    - **Action:** Stabilize auth state management to prevent login screen flashes.
    - **Details:**
        - **Auth Guard:** Implement a unified `isLoading` state in `AppNavigator` that waits for BOTH Supabase session and subscription check.
        - **Debug:** Investigate and fix the `SIGNED_IN -> SIGNED_OUT -> SIGNED_IN` event sequence.
        - **Splash:** Keep the splash screen or a dedicated loading view visible until the final route is determined.
    - **DoD:** Login transition is smooth with no intermediate screen flashes. The user lands directly on the Dashboard.

- [x] **1.7 Success Modal UI/UX Polish**
    - **Role:** `[UI/UX Designer & Frontend]`
    - **Action:** Refine micro-interactions and visual hierarchy of the celebration modal.
    - **Details:**
        - **Visual Hierarchy:** De-emphasize motivation text (12px, #8E8E93) to reduce noise.
        - **Entrance:** Add a smooth 300ms fade + scale (0.95 -> 1.0) transition.
        - **Climax:** Trigger a "Pop" effect (scale pulse) when the money counter finishes.
    - **DoD:** The modal feels premium and professional, with fluid animations and clear information hierarchy.

- [ ] **1.8 The Lifeline (Emergency Freeze) 🆕**
    - **Role:** `[Fullstack Engineer]`
    - **Action:** Implement a "Fairness Valve" allowing users to handle force majeure events without resentment.
    - **Details:**
        - **DB:** Add status enum support for 'frozen' or a `frozen_at` / `unfreeze_date` timestamp to commitments table.
        - **Policy:** Allow one-time only freeze per commitment (e.g., extends deadline by 3 days or pauses for 48h).
        - **UI:** Add a "Freeze Commitment" option in `CommitmentDetailScreen` (only visible if not already frozen and not overdue).
        - **UX:** Add a confirmation modal explaining: *"You can only do this once. Use it for emergencies (illness, busy work)."*
    - **DoD:** User can successfully extend/pause a commitment once. The UI updates to show the "Frozen" status or new deadline.

- [ ] **1.9 Hyper Scanner (ISBN Barcode) 🆕**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Eliminate the friction of searching for books manually.
    - **Details:**
        - **Tech:** Use `expo-camera` or `react-native-vision-camera` with Code Scanner.
        - **UX:** "Beep" sound on recognition. Instant transition to "Create Commitment" screen.
        - **Fallback:** Manual search if barcode is unreadable.
    - **DoD:** User can scan a book and start committing in < 2 seconds.

---

## 🌌 Phase 2: Agentic Roadmap: The "Cinematic" Onboarding Flow (Beyond Ultimate)

**Objective:** Create a fluid, emotionally intelligent onboarding experience that feels like a cinematic journey.
**Core Concepts:** "Living Atmosphere", "Reactive Conversation", "Ritualistic Inputs".
**Tech Stack:** `react-native-reanimated` (v4), `@shopify/react-native-skia`, `expo-haptics`, `expo-av`, `react-native-gesture-handler`.

### Phase 2.0: The Atmosphere (The Stage) ✅
**Goal:** Create a continuous, living world that connects all 15 screens.

- [x] **2.0.1 The Living Background (Mesh Gradient)**
    - **Concept:** A full-screen animated background layer that persists across navigation changes.
    - **Tech:** `@shopify/react-native-skia` with animated mesh gradient orbs.
    - **Behavior:**
        - **Act 1 (Hook):** Cool Blue/Purple (Calm, Intellectual).
        - **Act 2 (Tension):** Deep Red/Black (Warning, Anxiety).
        - **Act 3 (Resolution):** Bright Gold/White (Hope, Achievement).
    - **DoD:** Background colors morph smoothly (duration: 1000ms) between sections without cutting.
    - **Implementation:** `src/components/onboarding/LivingBackground.tsx`

- [x] **2.0.2 The "Reactive" Toast System**
    - **Concept:** Small text bubbles that popup during input to comment on user data (e.g., "Wow, ambitious!").
    - **DoD:** User feels "heard" by the system immediately.
    - **Implementation:** `src/components/onboarding/ReactiveToast.tsx`, `ReactiveToastManager.tsx`, `src/hooks/useReactiveToast.ts`

- [x] **2.0.3 Global Animation & Audio Config**
    - **Action:** Create `src/config/animation.ts` and `src/lib/audio.ts`.
    - **Details:** Define standard physics (SPRING_CONFIGS, TIMING_CONFIGS, ACT_THEMES) and initialize SoundManager (placeholder mode).
    - **Implementation:** `src/config/animation.ts`, `src/lib/audio.ts`, `src/context/OnboardingAtmosphereContext.tsx`

### Phase 2.1: Act 1 - The Awakening (Screens 0-4)
**Theme:** "Curiosity" - Fluid interactions that feel like magic.

- [ ] **2.1.1 Screen 0 (Welcome): The Kinetic Intro**
    - **Action:** Instead of a static start screen.
    - **Animation:** Words "Stop Reading." -> (Pause) -> "Start Finishing." animate in sync with heavy haptics.
    - **Interaction:** "Slide to Begin" (not tap).

- [ ] **2.1.2 Screen 1 (Tsundoku): The Visual Weight**
    - **Interaction:** As the number on the wheel increases, the text gets Heavier (Font Weight) and Larger.
    - **Reactive Copy:**
        - 0-5 books: "A good start."
        - 10+ books: "That's a lot of knowledge waiting."
        - 50+ books: "It's time to unlock this potential."

- [ ] **2.1.3 Screen 3 (Selection): The Anchor Object**
    - **Concept:** The "Shared Element" Transition.
    - **Details:** Once a book is picked, the cover image becomes the "Hero Object." It stays on screen, floating to the corner or background, watching over the rest of the process.

### Phase 2.2: Act 2 - The Crisis (Screens 5-10)
**Theme:** "Visceral Reality" - Using sensory overload to create urgency.

- [ ] **2.2.1 Screen 5 (Penalty): The Haptic Resistance**
    - **Concept:** "Physical Resistance" slider.
    - **Details:** The slider should feel "harder" to push as the amount goes up (simulate via Haptic density).
    - **Visual:** The "Living Background" turns into a dark, pulsating red vignette.
    - **Sound:** Low-frequency drone sound (Shepard Tone) that rises in pitch as amount increases.

- [ ] **2.2.2 Screen 7 (Opportunity Cost): The Burn**
    - **Action:** Visualizing loss.
    - **Animation:** Display the calculated lost money/time. Then, apply a "Burning" or "Ash" effect (Shader or Lottie) to the numbers to symbolize them disappearing forever.
    - **DoD:** User visually sees their resources vanishing.

### Phase 2.3: Act 3 - The Covenant (Screens 11-15)
**Theme:** "The Redemption" - A sacred agreement.

- [ ] **2.3.1 Screen 12 (The Plan): The Blueprint**
    - **Animation:** Don't just show a list. Draw the plan like a technical blueprint or architectural sketch being drawn in real-time.
    - **Sound:** Fast typing/sketching ASMR sound.

- [ ] **2.3.2 Screen 13 (The Paywall): The Slider Commit**
    - **Critique of Previous:** A simple button is too easy.
    - **New Interaction:** "Slide to Commit" (like unlocking an iPhone or Robinhood trade).
    - **Metaphor:** "Signing the contract."
    - **Feedback:** As the user slides, the haptics build up (revving engine). On completion, Explosion.

- [ ] **2.3.3 Screen 15 (The Transition): The Warp Speed**
    - **Animation:**
        - The "Hero Book" (from Screen 3) moves to the center.
        - Background accelerates (Star Wars warp speed effect).
        - Seamless landing on the Dashboard with the book already in place.

### Phase 2.4: Tech & QA Specs
- [ ] **2.4.1 Shader Integration (Skia)**
    - Use `@shopify/react-native-skia` for the "Living Background" and "Burning Text" effects if possible (fallback to Reanimated gradients if not).
- [ ] **2.4.2 Audio Orchestration**
    - Ensure background ambient sounds (drone, hum) fade in/out smoothly between Acts.
- [ ] **2.4.3 "Thumb Zone" Design**
    - All interactive elements (Sliders, Wheels, Slide-to-confirm) must be within the bottom 40% of the screen for one-handed use.

---

## 🟡 Phase 3: Release Blockers (Stabilization)

**Objective:** Ensure the app is stable, type-safe, and configurable before adding new features.

- [x] **3.1 Environment & Configuration Safety**
    - **Role:** `[System Architect]`
    - **Action:** Create `src/config/env.ts` with strict validation.
    - **DoD:** App crashes immediately on boot if `.env` is broken.

- [x] **3.2 Global Error Handling**
    - **Role:** `[React Component Dev]`
    - **Action:** Create `src/components/ErrorBoundary.tsx`.
    - **DoD:** Graceful failure UI instead of white screens.

- [x] **3.3 Strict Type Definitions (Supabase)**
    - **Role:** `[TypeScript Expert]`
    - **Action:** Update `src/types/database.types.ts` and `src/lib/supabase.ts`.
    - **Details:**
        - Focus on **Supabase Client generic types** and **Data Fetching** code.
        - Change `catch (error: any)` to `unknown` and implement proper type guards.
    - **DoD:** No `any` types in data fetching logic.

- [x] **3.4 Critical UI Edge Cases**
    - **Role:** `[UI Designer]`
    - **Action:** Polish `BookDetailScreen` loading state and `DashboardScreen` empty state.
    - **DoD:** UI feels responsive and inviting even with no data.

---

## 🔵 Phase 4: Engagement, Retention & Virality

**Objective:** Integrate world-class trends to keep users engaged and drive social sharing.

- [ ] **4.1 Dynamic Pacemaker (The Intelligent Coach) 🆕**
    - **Role:** `[Mobile Engineer]`
    - **Action:** Implement smart, calculated local notifications.
    - **Details:**
        - **Logic:** Calculate `(TargetPage - CurrentPage) / DaysRemaining` daily.
        - **Notification:** Instead of "Read book", send "Read 12 pages today to stay safe."
        - **Tech:** Use `expo-notifications`. Schedule local notifications at user-preferred time.
    - **DoD:** Users receive daily notifications with specific, dynamic page counts.

- [ ] **4.2 The Commitment Receipt (Viral Loops) 🆕**
    - **Role:** `[Creative Technologist]`
    - **Action:** Generate "Receipt-style" vertical images for completion sharing.
    - **Details:**
        - **Design:** Mimic a physical thermal receipt (monospaced font, jagged bottom).
        - **Items:** Book Title, Pages Read, Time Spent, "Penalty Saved (¥3,000)", "Tax (Stress: 0%)".
        - **Tech:** Use `react-native-view-shot` to capture hidden view. Add barcode and user signature.
    - **DoD:** Users can save/share a stylish receipt image to Instagram Stories.

- [ ] **4.3 Monk Mode (Immersive Focus & Strict Timer) 🆕**
    - **Role:** `[Audio/Interaction Designer]`
    - **Action:** Create a strict focus mode that punishes distraction while providing ambient focus.
    - **Details:**
        - **Ambience:** Play selectable white noise (Rain, Fireplace, Coffee Shop) using `expo-av`.
        - **Strict Logic:** Monitor app state (foreground/background). If user backgrounds the app during a session, immediately reset the current timer to 0.
        - **UX:** Dark, minimal interface. A "Start Reading" button initiates the ritual.
        - **Sunk Cost:** Display "Time at Risk: 25 mins" to warn users against leaving.
    - **DoD:** A timer that resets on app exit, enforcing deep focus with ambient sound.

- [ ] **4.4 Lock Screen Live Activity (Invasive UX) 🆕**
    - **Role:** `[Native Module Specialist]`
    - **Action:** Implement iOS Live Activity (Dynamic Island) for active commitments.
    - **Details:**
        - **Widget:** Show "Pages Left" and "Time Remaining" directly on Lock Screen.
        - **Urgency:** Dynamic Island pulses red when < 2 hours remain.
        - **Tech:** Use Expo Config Plugins / Native Modules (Swift).
    - **DoD:** Critical info is visible without unlocking the phone.

- [ ] **4.5 Advanced Animation Polish**
    - **Role:** `[Animation Specialist]`
    - **Action:** Refine all micro-interactions based on beta feedback.

---

## 🛠️ Phase 5: Technical Debt & Maintenance

**Objective:** Keep the codebase modern and resolve deprecation warnings.

- [ ] **5.1 Migrate Audio System (expo-av to expo-audio)**
    - **Role:** `[Core Engineer]`
    - **Action:** Replace `expo-av` with the new `expo-audio` package.
    - **Details:** `expo-av` is deprecated as of SDK 54. Update `src/lib/audio.ts` to use the modern API.
    - **DoD:** All sound effects and BGM work correctly with the new library, and the deprecation warning is resolved.

