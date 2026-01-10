# PHASE 4.9: THE TITAN DESIGN OVERHAUL (Hardcore Luxury)

**Objective:** Transform the app from a "Productivity Tool" into an "Agent's Asset Protection Tool".
**Aesthetic:** 007 / High-End Fintech / Military Spec.
**Core Guidelines:**
1.  **No Flat Grey:** Replace with Matte Black, Carbon, and Brushed Metal textures.
2.  **No Drop Shadows:** Use "Inner Glows" and "Borders" to create embedded depth.
3.  **Monospace Data:** All numbers (currency, pages, time) must be Monospace.
4.  **Micro-caps:** All labels must be small, uppercase, and wide-tracked.

---

## 🛠️ Step 1: Global Theme Integration

- [ ] **1.1 Apply Titan Theme:**
    - Update `src/theme/index.ts` to export `titanColors` and `titanTypography`.
    - Replace usage of `colors.background.primary` globally with `titanColors.background.primary` (#0A0A0A).

- [ ] **1.2 Typography Update:**
    - Create a reusable `<Text>` wrapper or style utility that enforces the new typography rules.
    - **Utility:** `TacticalText` component for data/numbers (Monospace).
    - **Utility:** `LabelText` component for Micro-caps.

---

## 🖥️ Step 2: Component Overhaul

### 2.1 The Mission Control (Dashboard)
- [ ] **Home Header:**
    - Remove standard greeting.
    - Add "Status: ACTIVE" or "Status: DORMANT" indicator with pulsing led.
    - Implement the **Activity Matrix** (Item 4.8) here with the new dark aesthetic.

### 2.2 The Metal Plate (Commitment Card)
- [ ] **Redesign `CommitmentCard.tsx`:**
    - **Background:** Dark Carbon (#111111) with a subtle 1px border (#333).
    - **Progress Bar:** Thin, laser-sharp line. Neon Red for progress.
    - **Cover Image:** Desaturated or High-Contrast filter (optional, nice to have).
    - **Details:** Use Monospace for "Page 120 / 300".

### 2.3 Security Clearance Inputs (Forms)
- [ ] **Redesign Inputs (`PenaltyAmountInput`, etc.):**
    - Remove rounded white backgrounds.
    - Style: Transparent background, bottom border only (1px solid #444).
    - Focus State: Border turns Neon Red or Gold. Glow effect.
    - Cursor: Blinking block cursor if possible, or standard color match.

### 2.4 Navigation & Tab Bar
- [ ] **Tab Bar:**
    - Background: Blurred Dark Glass (Absolute Black with high transparency).
    - Icons: Thin stroke icons.
    - Active State: Gold or Neon Red tint.

---

## 🎨 Step 3: Animation & Feedback

- [ ] **Haptics:** Increase "heaviness" of haptics. Use `Haptics.ImpactFeedbackStyle.Heavy` for major actions.
- [ ] **Sounds:** Verify "Click" and "Lock" sounds match the metal aesthetic.

---

## ✅ Definition of Done (DoD)

1.  App launches with a cohesive Dark/Titanium theme.
2.  No legacy "White" or "Light Grey" backgrounds remain.
3.  All numbers are Monospace.
4.  Commitment Cards look like physical keycards/plates.
