# COMMIT App Development Roadmap & Design Spec

## 🛠 Project Context & Tech Stack
- **Framework**: React Native (Expo SDK 50+)
- **Animation**: `react-native-reanimated` (v3), `moti`
- **Backend**: Supabase, Edge Functions
- **Payments**: RevenueCat (IAP for Subscription), Stripe (Off-Session for Penalties)
- **Concept**: "Fluid Commitment" - A habit tracking app that uses financial stakes.

---

## 📅 Phase 1: Release Blockers (Priority: High)
*Essential tasks for Store Review and App Functionality.*

### 1. Store Admin & Legal
- [ ] **Tax & Banking**: Setup in App Store Connect / Google Play Console.
- [ ] **Subscription Product**: Create Product IDs (e.g., `com.commitapp.monthly`).
- [ ] **iPad Support**: Verify `app.json` settings (set `ios.supportsTablet: false` if layout is broken).
- [ ] **Legal Docs**: Create TOS and Privacy Policy pages (must explain penalty usage).
- [ ] **Attribution**: Add "Powered by Google" to Book Search screen.

### 2. Payment Infrastructure (Hybrid Model)
- [ ] **RevenueCat Integration**:
    - Replace current Stripe subscription logic with RevenueCat (or `react-native-iap`).
    - Implement Restore Purchase button.
- [ ] **Stripe Flow Migration**:
    - Move card registration (SetupIntent) to `CreateCommitmentScreen`.
    - Remove Stripe UI from Onboarding Paywall.
    - Save Stripe Customer ID to Supabase `users` table.
- [ ] **Apple Privacy Manifest**: Ensure SDKs (Stripe/RevenueCat) are declared.

### 3. Backend Logic (Edge Functions)
- [ ] **Deadline Check**: Create batch job to identify expired commitments.
- [ ] **Penalty Execution**: Implement Off-Session Stripe payment logic.
- [ ] **Cron Job**: Schedule daily checks via `pg_cron`.
- [ ] **Timezone**: Add `timezone` column to `commitments` and handle logic.

---

## 🎨 UI/UX Design Spec: "Fluid Commitment"
*Implementation utilizing `react-native-reanimated` and `moti`.*

### Core Principles
1. **Continuity**: Seamless shared element transitions.
2. **Feedback**: Immediate reaction to touch.
3. **Delight**: Physical, spring-based animations.

### 1. Dashboard (The Focus)
- **Hero Card**:
    - Large active book card (60% height).
    - **"Breathing" Animation**: Glow effect when deadline < 3 days.
    - **Transition**: `SharedTransition` to Detail Screen.
- **Stats Ticker**:
    - Slot-machine style number rotation for "Money Saved".
- **FAB (Floating Action Button)**:
    - Ripple effect on tap to open Search.
    - Auto-hide (opacity) on scroll.

### 2. Library (The Trophy Room)
- **Layout**: Grid view (2 or 3 columns) with 3D book cover effect (shadow/thickness).
- **Holographic Stamp**: Use `DeviceMotion` to create a shiny "Completed" stamp overlay.
- **Entrance**: Staggered fade-in using `Moti` (delay by index).

### 3. Creation Flow & Inputs
- **Interactive Slider (Page Count)**:
    - Spring animation on value change.
    - Background color morphing: White -> Grey -> Warning Red.
    - Haptic feedback at milestones (10, 50, etc).
- **Amount Setting (Penalty)**:
    - **Vignette Effect**: Darken screen corners as amount increases.
    - **Pulse**: The "Set Pledge" button mimics a heartbeat.

---

## 🛡 Phase 2: Stability & Trust
- [ ] **Global Error Boundary**: Friendly crash screen + restart button.
- [ ] **Support**: Add link to Developer contact/SNS in Settings.
- [ ] **Notifications**: Local notifications for 3-day, 1-day, and same-day reminders.
- [ ] **Free Trial**: Configure trial period in IAP settings.

## 📈 Phase 3: Growth
- [ ] **In-App Review**: Trigger via `expo-store-review` upon commitment completion.
- [ ] **Social Share**: Generate image for SNS sharing.
- [ ] **Reading Progress**: Visual progress bar based on page count.