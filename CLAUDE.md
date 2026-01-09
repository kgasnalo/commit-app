# Commands
- start: npx expo start
- ios: ./run-ios-manual.sh (preferred over `npm run ios` to avoid Xcode Error 65/115)
- android: npm run android
- install: npx expo install
- typecheck: npx tsc --noEmit

# Project Architecture
- Framework: Expo SDK 54 (React Native 0.81)
- Language: TypeScript (Prefer .tsx/.ts for new files)
- Navigation: React Navigation v7 (Stack & Bottom Tabs)
- Backend: Supabase (Auth, Database, Storage)
- State/Async: Use standard React hooks + Supabase client
- Source Directory: ./src (Keep all new components/screens here)

# Code Style Guidelines
- Use React Functional Components with TypeScript interfaces.
- Use `StyleSheet.create` for static styles.
- **Localization (i18n):** Zero tolerance for hard-coded strings. All UI text, alerts, and placeholders MUST use `i18n.t()`. When adding new strings, update ALL locale files (`ja.json`, `en.json`, `ko.json`).
- **Layouts:** Design for variable text length (EN/KO > JA). Avoid fixed widths/heights on text containers. Use Flexbox `gap` and `padding` for responsiveness.
- **Animations:** Prefer `react-native-reanimated` (v4). **DO NOT use `moti`** - it is incompatible with Reanimated v4.1.1+ and causes "Invalid hook call" crashes. Use pure Reanimated Layout Animations (`FadeInUp`, `FadeOutUp`, etc.) instead of moti's `MotiView` and `AnimatePresence`.
- Icons: Use `lucide-react-native` or `@expo/vector-icons`.
- Formatting: Ensure code is clean and readable.
- **Import Paths:** Use relative paths (e.g., `../../utils`) consistently to avoid path resolution errors.

# Critical Rules
- **Dependency Management:** ALWAYS use `npx expo install` to install libraries (ensures version compatibility).
- **Navigation:** We use React Navigation v7. Do NOT mix with Expo Router syntax.
- **Safety:** Always add error handling (try/catch) when calling Supabase or async functions.
- **Context:** Before editing a file, always READ it first to understand existing logic.
- **Language:** ユーザーへの回答や説明は常に日本語で行うこと。
- **STRICT Localization (i18n):**
  - **ZERO TOLERANCE** for hard-coded strings in TSX/TS files.
  - **NO Japanese in `defaultValue`**: `i18n.t('key', { defaultValue: 'こんにちは' })` is FORBIDDEN. Use `i18n.t('key')` only.
  - **Sync All Languages**: When adding a key, add it to `ja.json`, `en.json`, AND `ko.json` immediately.
  - **Dates & Currency**: Use `toLocaleDateString` and `toLocaleString` with proper locales. Do not manually format strings like `${m}月${d}日`.
- **Page Count Logic:** In Continue Flow, the slider displays "end page number" but DB stores "pages to read" (quantity). Calculate delta: `pagesToRead = pageCount - totalPagesRead`. This is because `getBookProgress` sums `target_pages` from all commitments.
- **i18n Sync:** When updating UI strings (placeholders, labels, messages), ALWAYS update ALL locale files (`src/i18n/locales/en.json`, `ja.json`, `ko.json`). Never update just one language.
- **Edit Verification:** After making file edits, ALWAYS re-read the file to confirm changes were applied correctly before reporting task completion. Never assume edits succeeded without verification.
- **Environment Variables:** NEVER use `process.env.EXPO_PUBLIC_*` directly. Always import from `src/config/env.ts` which provides validated, type-safe access. This ensures the app crashes immediately on startup if required env vars are missing.
- **Supabase Types:** When updating `src/types/database.types.ts`, ALWAYS include `Relationships: []` (or actual relations) for each table. Without this, Supabase JS v2.89+ resolves types to `never`, breaking all queries. Also add `CompositeTypes: { [_ in never]: never }` to the database interface.
- **DB Field Naming:** The database uses `pledge_amount` and `currency` for commitment penalties. Do NOT use `penalty_amount` or `penalty_currency` - these are deprecated field names from an earlier schema.
- **Reanimated SharedValue:** NEVER read `.value` directly during JSX render (causes "[Reanimated] Reading from 'value' during component render" warning). Follow these patterns:
  - **Wrap in useDerivedValue:** `const colors = useDerivedValue(() => [color.value, 'transparent']);`
  - **Scroll events:** Use `useAnimatedScrollHandler` (NOT `useCallback`). Example: `const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });`
  - **Arrays in useAnimatedStyle:** Calculate `inputRange` and similar arrays INSIDE the worklet, not in render scope.
  - **Gesture.Pan():** Do NOT use `.enabled(sharedValue.value)`. Instead, check inside callbacks: `.onBegin(() => { if (isCompleted.value) return; ... })`
  - **useDerivedValue:** Use v3 style (no dependency array). Write `useDerivedValue(() => x.value)` NOT `useDerivedValue(() => x.value, [x])`.
  - **Three-layer pattern for entering + transform:** Outer `<Animated.View entering={...}>` → Middle `<Animated.View style={transformStyle}>` → Inner plain `<Text>`.
- **Navigation Stack Switching:** Do NOT use `navigation.reset()` to switch between authentication stacks (Onboarding vs MainTabs). Instead, update auth state in Supabase and call `triggerAuthRefresh()` from `src/lib/supabase.ts` to notify AppNavigator. The navigator will automatically switch stacks based on `isSubscribed` state.
- **Onboarding Screen 7 (Point of No Return):** This screen follows account registration (Screen 6). ALWAYS keep `showBackButton={false}` in `OnboardingLayout` for this screen. Navigating back after registration causes `GO_BACK not handled` errors because the stack history is cleared/reset upon auth state change. Use the `screen7_no_turning_back` toast to explain this to the user.
- **Reanimated withDelay Reliability:** `withDelay` may fail to trigger in complex animation sequences. For critical timing (e.g., cinematic reveals), use `setTimeout` to control when animations start, then call `withTiming` directly inside the callback:
  ```typescript
  // UNRELIABLE:
  opacity.value = withDelay(1000, withTiming(1, { duration: 800 }));

  // RELIABLE:
  setTimeout(() => {
    opacity.value = withTiming(1, { duration: 800 });
  }, 1000);
  ```
- **Skia + Reanimated v4 Compatibility:** Skia components (Canvas, Text, etc.) may not properly reflect `useDerivedValue` changes from Reanimated v4. For overlay/transition components that must render reliably, prefer React Native's `Animated.View` and `Text` over Skia.
- **Full-Screen Overlay Layering:** For overlay components (modals, transitions), explicitly set BOTH `zIndex` (iOS) AND `elevation` (Android) on ALL layers. Use absolute positioning with `top/left/right/bottom: 0` on each layer:
  ```typescript
  blackout:    { position: 'absolute', ...absoluteFill, zIndex: 1, elevation: 1 }
  content:     { position: 'absolute', ...absoluteFill, zIndex: 100, elevation: 100 }
  topLayer:    { position: 'absolute', ...absoluteFill, zIndex: 9999, elevation: 9999 }
  ```
