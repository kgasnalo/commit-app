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
- **Realtime & Animation Timing (CRITICAL):** When updating `subscription_status` or other fields that trigger Supabase Realtime, the update causes immediate navigation stack switching via `onAuthStateChange` or Realtime subscriptions. If you need to show an animation/transition BEFORE the stack switch, update the DB AFTER the animation completes:
  ```typescript
  // BAD - Animation never shows (Realtime triggers stack switch immediately)
  await supabase.from('users').update({ subscription_status: 'active' });
  setShowAnimation(true);  // Component already unmounted!

  // GOOD - Animation completes, then stack switches
  setShowAnimation(true);
  // ... in animation onComplete callback:
  await supabase.from('users').update({ subscription_status: 'active' });
  triggerAuthRefresh();
  ```
- **TOKEN_REFRESHED Event Handling:** In `onAuthStateChange`, the `TOKEN_REFRESHED` event should NOT trigger a full subscription status re-check. This can cause unexpected stack switches (e.g., timeout → `isSubscribed: false` → back to Onboarding). Preserve the existing `isSubscribed` state and only update the session:
  ```typescript
  if (event === 'TOKEN_REFRESHED') {
    setAuthState(prev => {
      if (prev.status !== 'authenticated') return prev;
      return { ...prev, session }; // Keep isSubscribed unchanged
    });
    return;
  }
  ```
- **Navigation & Screen Registration:** 
  - When calling `navigation.navigate('ScreenName')`, ALWAYS verify that `'ScreenName'` is registered in `src/navigation/AppNavigator.tsx`.
  - New screens MUST be added to the appropriate Stack/Tab navigator in `AppNavigator.tsx` before they can be used for navigation.
  - If a screen is used in multiple auth states (e.g., Onboarding), ensure it is registered in all relevant stack conditional blocks.
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
- **Flexbox Hierarchy & i18n Layout Overlap:** When visually adjacent elements are placed in separate Flex containers (e.g., `body` vs `footer` in OnboardingLayout), they may overlap because Flexbox calculates each container's layout independently. This issue is often invisible in Japanese (shorter text) but severe in English/Korean (2-3x longer text).
  - **Problem Pattern:**
    ```
    body (flex: 1)
      └── sliderContainer
          └── labelsContainer (¥0, ¥1,000...)
    footer
      └── ruleTextContainer (explanation text) ← Separate hierarchy = overlap risk
    ```
  - **Solution:** Place related UI elements in the SAME parent container to ensure proper vertical flow:
    ```
    body (flex: 1)
      └── sliderContainer
          ├── labelsContainer
          └── amountDisplay
    footer
      └── donationCard
          └── ruleText (integrated) ← Same container = no overlap
    ```
  - **Text Wrapping:** Use `numberOfLines={0}` for dynamic text that varies significantly across languages. Avoid `numberOfLines={2}` with `adjustsFontSizeToFit` for long English sentences—they will break layout.
  - **Always test layouts with the longest expected language (typically English).**
- **flexWrap + flex: 1 Height Calculation Bug:** When using `flexWrap: 'wrap'` on a container, do NOT use `flex: 1` on child elements. The combination causes incorrect height calculation, making subsequent elements overlap.
  - **Problem:** `flex: 1` + `minWidth: '45%'` in a `flexWrap` container → child heights not calculated correctly → text below overlaps buttons
  - **Solution:** Use explicit `width: '48%'` (or similar) instead of `flex: 1` for wrapped children:
    ```typescript
    // BAD - causes overlap
    amountButton: { flex: 1, minWidth: '45%', ... }

    // GOOD - proper height calculation
    amountButton: { width: '48%', ... }
    ```
- **Nested Navigator Navigation:** When navigating from one tab (e.g., LibraryTab) to a screen in another tab's stack (e.g., CreateCommitment in HomeTab), use nested navigation syntax:
  ```typescript
  // BAD - screen not found error
  navigation.navigate('CreateCommitment')

  // GOOD - navigate to tab first, then screen
  navigation.navigate('HomeTab', { screen: 'CreateCommitment' })
  ```
- **Language Instant Switching:** Use `LanguageContext` (`src/contexts/LanguageContext.tsx`) to manage language state. The `NavigationContainer` has `key={language}` which forces full remount when language changes. Components that need to react to language changes should use `useLanguage()` hook.
- **Cinematic Reveal Trigger:** The `CinematicCommitReveal` component must be triggered by setting state, NOT by navigation:
  ```typescript
  // BAD - navigates to non-existent screen, cinematic never shows
  navigation.navigate('WarpTransition', {...})

  // GOOD - actually triggers the cinematic overlay
  setShowWarpTransition(true);
  ```
- **Cross-Stack State Passing:** When passing state between navigation stacks (e.g., Onboarding → MainTabs after auth), route params are lost because stacks are completely replaced. Use AsyncStorage:
  ```typescript
  // Before stack switch (in OnboardingScreen13)
  await AsyncStorage.setItem('showDashboardFadeIn', 'true');
  triggerAuthRefresh(); // This replaces the entire navigation stack

  // After stack switch (in DashboardScreen)
  const shouldFade = await AsyncStorage.getItem('showDashboardFadeIn');
  if (shouldFade === 'true') {
    await AsyncStorage.removeItem('showDashboardFadeIn');
    // Start fade-in animation
  }
  ```
- **i18n defaultValue Anti-Pattern:** NEVER use `defaultValue` in `i18n.t()` calls. It causes translations to be bypassed:
  ```typescript
  // BAD - shows English even when locale is Japanese
  i18n.t('celebration.title', { defaultValue: 'Commitment Achieved!' })

  // GOOD - uses proper translation from locale files
  i18n.t('celebration.title')
  ```
  If a key is missing, add it to ALL locale files (`ja.json`, `en.json`, `ko.json`) immediately.
- **Supabase Deployment (CRITICAL):** Creating migration files or Edge Functions is NOT enough. You MUST deploy them:
  - **Database Migrations:** After creating `supabase/migrations/*.sql`, run `supabase db push` to apply to remote database. The migration file alone does nothing.
  - **Edge Functions:** After creating `supabase/functions/<name>/index.ts`, run `supabase functions deploy <name>` to deploy.
  - **Migration History Mismatch:** If `supabase db push` fails with version mismatch, run `supabase migration repair --status reverted <version>` first.
  - **Verify:** Always run `supabase migration list` to confirm migrations are applied (shows in both Local and Remote columns).
  ```bash
  # Complete Supabase deployment workflow:
  supabase migration list          # Check current state
  supabase db push                 # Apply pending migrations
  supabase functions deploy <name> # Deploy Edge Functions
  ```
- **Native Modules Require Rebuild:** Certain Expo packages are native modules and do NOT work in Expo Go. After installing or updating these packages, you MUST rebuild the development client:
  - `expo-camera` (barcode scanning)
  - `expo-notifications` (push notifications)
  ```bash
  npx expo run:ios    # iOS rebuild (or ./run-ios-manual.sh)
  npx expo run:android # Android rebuild
  ```
- **CameraView Overlay Touch Handling:** When placing interactive UI (buttons, headers) over a CameraView, touch events may be blocked by overlay containers. Use this pattern:
  ```typescript
  // Overlay container: let touches pass through to children
  <View style={styles.overlay} pointerEvents="box-none">
    // SafeAreaView: also pass through
    <SafeAreaView pointerEvents="box-none">
      // Interactive container: explicitly receive touches
      <View style={styles.header} pointerEvents="auto">
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </View>
  ```
  - `pointerEvents="box-none"`: Container ignores touches, but children can receive them
  - `pointerEvents="auto"`: Container and children receive touches normally
  - Always add `hitSlop` to small touch targets for better UX
- **Theme Colors Structure:** The `colors` object in `src/theme/colors.ts` uses nested structure. Do NOT use flat references:
  ```typescript
  // BAD - these don't exist
  colors.primary
  colors.border

  // GOOD - use nested paths
  colors.accent.primary      // #FF4D00 (orange)
  colors.background.primary  // #0A0A0A (dark)
  colors.text.primary        // #FFFFFF (white)
  colors.border.default      // #333333
  colors.status.error        // #FF3D00
  ```
- **Titan Design System (Phase 4.9):** For dark UI screens (MonkMode, CreateCommitment, CommitmentDetail, Receipt), use this unified luxury design pattern:
  ```typescript
  // Titan Background - Warm dark gradient with ambient lighting
  <View style={styles.backgroundContainer} pointerEvents="none">
    <LinearGradient
      colors={['#1A1008', '#100A06', '#080604']}
      locations={[0, 0.5, 1]}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={['rgba(255, 160, 120, 0.15)', 'rgba(255, 160, 120, 0.06)', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.8, y: 0.7 }}
      style={StyleSheet.absoluteFill}
    />
  </View>

  // Glassmorphism card
  glassmorphismCard: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  }

  // Piano Black button with orange glow
  pianoBlackButton: {
    backgroundColor: '#1A1714',
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }

  // Luxury gauge text glow
  luxuryGaugeText: {
    fontSize: 48,
    fontWeight: '200',
    color: '#FAFAFA',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  }

  // Orange accent color: #FF6B35
  ```
- **Language Detection:** Do NOT use `i18n.language` directly (property doesn't exist on I18n type). Use the `useLanguage()` hook from `LanguageContext`:
  ```typescript
  // BAD
  const locale = i18n.language === 'ja' ? 'ja-JP' : 'en-US';

  // GOOD
  const { language } = useLanguage();
  const locale = language === 'ja' ? 'ja-JP' : 'en-US';
  ```
- **Reanimated SharedValue Import:** When using `SharedValue` type in TypeScript interfaces, import it directly from `react-native-reanimated`. Do NOT use `Animated.SharedValue`:
  ```typescript
  // BAD - namespace error "has no exported member 'SharedValue'"
  interface Props {
    progress: Animated.SharedValue<number>;
  }

  // GOOD - direct import
  import { SharedValue } from 'react-native-reanimated';
  interface Props {
    progress: SharedValue<number>;
  }
  ```
- **Screen Component Props with Route Params:** For screens that receive route params in React Navigation, use the simple `{ route, navigation }: any` pattern (matching CommitmentDetailScreen, VerificationScreen, etc.). Strict typing causes type incompatibility with `Stack.Screen`:
  ```typescript
  // BAD - causes "Type is not assignable to ScreenComponentType" error
  interface MyScreenProps {
    route: { params: { id: string } };
    navigation: any;
  }
  export default function MyScreen({ route, navigation }: MyScreenProps)

  // GOOD - consistent with other screens in codebase
  export default function MyScreen({ route, navigation }: any)
  ```
- **Timer/Focus Screens Keep Awake:** For screens where the user expects the display to stay on (timers, focus modes, reading sessions), use `useKeepAwake()` from `expo-keep-awake`:
  ```typescript
  import { useKeepAwake } from 'expo-keep-awake';

  export default function TimerScreen() {
    useKeepAwake(); // Prevents screen from dimming/locking
    // ...
  }
  ```
- **PostgreSQL UUID Generation:** In Supabase migrations, use `gen_random_uuid()` (built-in to PostgreSQL 13+) instead of `uuid_generate_v4()` (requires uuid-ossp extension):
  ```sql
  -- BAD - requires extension that may not be enabled
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4()

  -- GOOD - built-in function
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  ```
- **Supabase Migration File Naming:** Use full timestamp format (`YYYYMMDDHHMMSS`) to avoid conflicts when multiple migrations are created on the same day:
  ```bash
  # BAD - causes conflicts if multiple files on same day
  20260113_create_table_a.sql
  20260113_create_table_b.sql  # Supabase CLI gets confused

  # GOOD - unique timestamps prevent conflicts
  20260113140000_create_table_a.sql
  20260113150000_create_table_b.sql
  ```
  If migration history becomes mismatched, repair with:
  ```bash
  supabase migration repair --status reverted <version>
  supabase db push
  ```
- **Notifications Deprecation:** In `expo-notifications`, `shouldShowAlert` is deprecated. Use `shouldShowBanner: true` and `shouldShowList: true` instead for foreground notification handling.
- **Data Fetching with React Navigation (CRITICAL):**
  - **Issue:** `useEffect` only runs on initial mount. When navigating back to a screen (Stack Pop), the screen is NOT re-mounted, so `useEffect` does NOT run, causing stale data (e.g., deleted items still showing).
  - **Solution:** Use `useFocusEffect` for data that must be fresh every time the screen is viewed.
  ```typescript
  import { useFocusEffect } from '@react-navigation/native';
  
  // BAD - Data becomes stale after navigation
  useEffect(() => {
    fetchData();
  }, []);

  // GOOD - Data refreshes every time screen appears
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );
  ```
  // Note: Keep one-time initializations (listeners, animations) in useEffect. Only move data fetching to useFocusEffect.
- **Google Books API & HTTPS (CRITICAL):**
  - **HTTPS Only:** iOS blocks `http://` resources (ATS). Always replace `http://` with `https://` for image URLs fetched from Google Books or stored in DB.
  - **Remove edge=curl:** Google Books image URLs often contain `&edge=curl` (curled page effect). This parameter frequently causes rendering failures or blank images in React Native. ALWAYS remove it: `url.replace(/&edge=curl/g, '')`.
  - **Undefined title/authors:** Google Books API can return items without `title` or `authors`. ALWAYS use null coalescing:
    ```typescript
    // BAD - crashes if title is undefined
    {item.volumeInfo.title.toUpperCase()}

    // GOOD - safe with fallback
    {(item.volumeInfo.title ?? i18n.t('common.untitled')).toUpperCase()}
    {item.volumeInfo.authors?.join(', ') || i18n.t('common.unknown_author')}
    ```
- **Hero/Billboard Overlays:** When placing text over images (HeroBillboard), keep overlay opacity low to ensure the image remains visible.
  - **Bad:** `rgba(0,0,0,0.7)` (Too dark, hides image)
  - **Good:** `rgba(10, 8, 6, 0.1)` to `rgba(8, 6, 4, 0.4)` gradient.
- **Hall of Fame / Archive Design Patterns (Phase 4.7):**
  - **Glass Panel:** Use top/left highlight edges only (0.5px), no bottom/right border. This creates a subtle 3D effect without looking like a bordered card.
  - **Typography on Dynamic Backgrounds:** Use `fontWeight: '600'` with black text shadows for text over book covers. See "Text Visibility on Dynamic Image Backgrounds" rule for full pattern.
  - **Self-glow Numbers:** For metrics on solid backgrounds, add `textShadowColor: 'rgba(255, 140, 80, 0.5)'` with `textShadowRadius: 12` for luxury gauge effect. For dynamic backgrounds, use black shadows instead.
  - **Micro Labels:** Use `fontSize: 11` with `fontWeight: '600'` and black shadows for guaranteed visibility.
  - **Metallic Badge:** SecuredBadge "metallic" variant uses `backgroundColor: 'rgba(20, 20, 18, 0.95)'` with top highlight only.
  - **Filter Bar Visibility:** When showing filter bars conditionally, use `>= 1` not `> 1` to ensure bar appears even with single item.
- **BookDetailScreen Tag Section:** Place interactive elements (like tag add button) OUTSIDE hero containers. Elements inside `ImageBackground` with `LinearGradient` overlay may have visibility/touch issues. Move to separate section below hero for reliable visibility and interaction.
- **Haptics Centralization:** NEVER use `expo-haptics` directly. Always use `HapticsService` from `src/lib/HapticsService.ts`:
  ```typescript
  // BAD - direct expo-haptics usage
  import * as Haptics from 'expo-haptics';
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  // GOOD - centralized service
  import { HapticsService } from '../lib/HapticsService';
  HapticsService.feedbackMedium();
  ```
  - Available methods: `feedbackLight()`, `feedbackMedium()`, `feedbackHeavy()`, `feedbackSuccess()`, `feedbackWarning()`, `feedbackError()`, `feedbackSelection()`
  - HapticsService includes 50ms throttling to prevent haptic overload
  - Only `src/lib/HapticsService.ts` should import `expo-haptics` directly
- **expo-audio (SDK 54):** This is a native module and does NOT work in Expo Go. After installing or modifying expo-audio:
  ```bash
  npx expo prebuild
  npx expo run:ios    # or ./run-ios-manual.sh
  ```
  - If you encounter `[Xcodeproj] Consistency issue` during build, run a clean rebuild: `rm -rf ios && npx expo prebuild`
- **iOS Audio Mode Constraint:** When using `setAudioModeAsync` from expo-audio, `playsInSilentMode: false` combined with `interruptionMode: 'duckOthers'` causes `[Error: Impossible audio mode]`. Always use:
  ```typescript
  await setAudioModeAsync({
    playsInSilentMode: true,  // REQUIRED when using duckOthers
    interruptionMode: 'duckOthers',
  });
  ```
- **Supabase OAuth in React Native (CRITICAL):** When implementing OAuth with `expo-web-browser` and `expo-auth-session`:
  - **PKCE + Implicit Flow:** Always support BOTH flows. Check for `code` parameter first (PKCE), then `access_token`/`refresh_token` (Implicit):
    ```typescript
    const code = urlObj.searchParams.get('code');
    if (code) {
      // PKCE Flow - modern Supabase default
      await supabase.auth.exchangeCodeForSession(code);
    } else {
      // Implicit Flow - legacy fallback
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      await supabase.auth.setSession({ access_token, refresh_token });
    }
    ```
  - **skipBrowserRedirect:** Set to `true` when using `WebBrowser.openAuthSessionAsync()` since it manages the browser lifecycle manually.
  - **Hardcode redirectTo:** Do NOT use `makeRedirectUri()` - it can generate incorrect URLs. Hardcode the scheme directly:
    ```typescript
    // BAD - can generate mismatched URL
    redirectTo: makeRedirectUri({ scheme: 'commitapp' })

    // GOOD - explicit scheme
    redirectTo: 'commitapp://'
    ```
  - **Deep Link Handler Required:** `openAuthSessionAsync` may not capture the redirect URL. Add global Linking listeners in AppNavigator:
    ```typescript
    import { Linking } from 'react-native';

    // Cold start
    Linking.getInitialURL().then(handleDeepLink);

    // Runtime
    Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    ```
  - **URL Polyfill (CRITICAL):** React Native lacks native `URL` class. The polyfill MUST be the **very first import** in `index.js` (app entry point), NOT in AppNavigator. Importing it elsewhere may cause `new URL()` to fail in Deep Link handlers:
    ```javascript
    // index.js - MUST be the first line
    import 'react-native-url-polyfill/auto';

    import { registerRootComponent } from 'expo';
    import App from './App';
    ```
  - **OAuth State Persistence (CRITICAL):** OAuth redirects cause complete navigation stack replacement. Any data needed after OAuth (username, form state) MUST be saved to AsyncStorage BEFORE starting OAuth:
    ```typescript
    // In OAuth screen (e.g., OnboardingScreen6)
    await AsyncStorage.setItem('onboardingData', JSON.stringify({
      selectedBook, deadline, pledgeAmount, currency,
      username, // Include any user input that must survive OAuth
    }));

    // In AppNavigator after session established
    const onboardingData = await AsyncStorage.getItem('onboardingData');
    const { username } = JSON.parse(onboardingData);
    await supabase.from('users').upsert({ id, email, username });
    ```
  - **User Record Creation Location (CRITICAL):** User record creation MUST happen inside `onAuthStateChange` (in the `SIGNED_IN` block), NOT in `handleDeepLink`. Deep link handlers and auth state listeners execute in parallel, causing race conditions where the app enters authenticated state before the user record exists.
    ```typescript
    // BAD - race condition with onAuthStateChange
    async function handleDeepLink(url) {
      await exchangeCodeForSession(code);
      await createUserRecord(session); // May not complete before auth state updates
    }

    // GOOD - blocking execution in auth listener
    onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await createUserRecordFromOnboardingData(session); // Blocks until complete
        const isSubscribed = await checkSubscriptionStatus(session.user.id);
        setAuthState({ status: 'authenticated', session, isSubscribed });
      }
    });
    ```
- **Commitment Creation via Edge Function (CRITICAL):** NEVER use direct `supabase.from('commitments').insert()` from client code. RLS policies may block inserts if user record doesn't exist or auth context is invalid. Always use the `create-commitment` Edge Function:
  ```typescript
  // BAD - blocked by RLS
  await supabase.from('commitments').insert({ user_id, book_id, ... });

  // GOOD - bypasses RLS with service_role, includes server-side validation
  await supabase.functions.invoke('create-commitment', {
    body: {
      book_title, book_author, book_cover_url,
      deadline, pledge_amount, currency, target_pages,
    },
  });
  ```
- **Auth State Change Timeouts (CRITICAL):** In `onAuthStateChange`, all async operations MUST have bounded execution times using `withTimeout` helper, and MUST use `try-finally` to GUARANTEE UI unlocking (exiting loading state):
  ```typescript
  // Helper function for timeout with fallback (no throw)
  async function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    fallback: T,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`⏱️ ${operationName}: Timed out after ${timeoutMs}ms`);
        resolve(fallback);
      }, timeoutMs);
    });
    return Promise.race([operation, timeoutPromise]);
  }

  // onAuthStateChange with guaranteed UI unlock
  onAuthStateChange(async (event, session) => {
    setAuthState({ status: 'loading' });
    let isSubscribed = false; // Default for fail-safe

    try {
      await withTimeout(createUserRecord(session), 5000, undefined, 'createUserRecord');
      isSubscribed = await withTimeout(checkSubscription(userId), 8000, false, 'checkSubscription');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      // GUARANTEE: Always exit loading state
      setAuthState({ status: 'authenticated', session, isSubscribed });
    }
  });
  ```
  - `createUserRecordFromOnboardingData`: 5 second timeout
  - `checkSubscriptionStatus`: 8 second outer timeout (has internal 2s timeout)
  - Never leave user stuck on "SYSTEM INITIALIZING..." screen
- **DB Trigger Race Condition:** NEVER use `setTimeout()` to wait for Supabase Auth Triggers to complete. Use `upsert` with `onConflict` and retry logic instead:
  ```typescript
  // BAD - flaky, fails under network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  await supabase.from('users').update({ username }).eq('id', userId);

  // GOOD - robust upsert with retry
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.from('users').upsert(
      { id: userId, email, username, subscription_status: 'inactive' },
      { onConflict: 'id' }
    );
    if (!error) break;
    await new Promise(r => setTimeout(r, 200 * attempt)); // Exponential backoff
  }
  ```
- **Arrow Function Declaration Order:** Unlike `function` declarations, `const` arrow functions are NOT hoisted. Helper functions MUST be declared BEFORE functions that use them:
  ```typescript
  // BAD - ReferenceError: Cannot access 'helper' before initialization
  const main = async () => { await helper(); };
  const helper = async () => { /* ... */ };

  // GOOD - helper declared first
  const helper = async () => { /* ... */ };
  const main = async () => { await helper(); };
  ```
- **Web Portal URL:** The production Web Portal URL is `https://commit-app-web.vercel.app`. Do NOT use `commit-app.vercel.app` (old/incorrect). When linking from mobile app to web (billing, terms, privacy), always use:
  ```typescript
  Linking.openURL('https://commit-app-web.vercel.app/billing')
  Linking.openURL('https://commit-app-web.vercel.app/terms')
  Linking.openURL('https://commit-app-web.vercel.app/privacy')
  ```
- **Vercel Deployment Workflow:** When deploying to Vercel:
  1. First-time: Run `npx vercel login` (opens browser for auth)
  2. Deploy: `npx vercel --prod --yes`
  3. **CRITICAL:** `.env.local` is NOT deployed. Set env vars via CLI:
     ```bash
     echo "VALUE" | npx vercel env add VAR_NAME production
     npx vercel env ls  # Verify
     npx vercel --prod  # Redeploy to pick up new vars
     ```
- **Supabase Config Push:** When pushing local config to remote, the CLI prompts for confirmation. Use pipe to auto-confirm:
  ```bash
  echo "Y" | supabase config push
  ```
  Or check if `--yes` flag is supported in newer CLI versions.
- **Edge Function Security (CRITICAL):** System-only Edge Functions (e.g., `send-push-notification`) MUST verify the caller is authorized. Checking for the presence of an Authorization header is NOT enough.
  ```typescript
  // BAD - Any user with JWT can call this
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return unauthorized()
  // ... proceeds without verification

  // GOOD - Verify caller is System/Admin
  function verifySystemAuthorization(authHeader: string): boolean {
    const token = authHeader.replace('Bearer ', '').trim()
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    return timingSafeEqual(token, serviceRoleKey)
  }

  if (!verifySystemAuthorization(authHeader)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }
  ```
  - Use timing-safe comparison to prevent timing attacks
  - Log security rejections for monitoring
  - Accept SERVICE_ROLE_KEY or CRON_SECRET only
- **pg_cron + Edge Function Authentication:** When calling Edge Functions from pg_cron jobs, use a dedicated `CRON_SECRET` instead of `SERVICE_ROLE_KEY`. The SERVICE_ROLE_KEY comparison via `timingSafeEqual` may fail due to how Supabase injects environment variables.
  ```bash
  # Set CRON_SECRET for Edge Function
  supabase secrets set CRON_SECRET=your-secret-here
  ```
  ```sql
  -- Store in Vault for cron job access
  SELECT vault.create_secret('your-secret-here', 'cron_secret');

  -- Reference in cron job
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/...',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  ```
- **Supabase CLI SQL Execution:** The Supabase CLI has no direct SQL execution command (`supabase db execute` does not exist). To run SQL on the remote database, create a migration file and use `supabase db push`:
  ```bash
  # Create migration file, then:
  supabase db push
  ```
- **Vault Secrets for Cron Jobs:** pg_cron jobs cannot directly access Edge Function environment variables. Store credentials in Supabase Vault and reference via `vault.decrypted_secrets` view.
- **Supabase Storage for Onboarding:** When creating storage buckets that need to accept uploads during onboarding (before user authentication), add a `public` INSERT policy in addition to `authenticated`:
  ```sql
  -- Authenticated users can upload
  CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'your-bucket');

  -- Public uploads for onboarding (unauthenticated users)
  CREATE POLICY "Allow public uploads"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'your-bucket');
  ```
- **Sentry Business Metrics (CRITICAL):** For business success events that must ALWAYS be recorded (even without errors), use `logBusinessEvent()` (captureMessage), NOT `addBreadcrumb()` or `incrementMetric()`. Breadcrumbs are only sent to Sentry if an error occurs later in the same request.
  ```typescript
  // BAD - Only visible if an error occurs later
  addBreadcrumb('Commitment created', 'business', { id: commitmentId });
  incrementMetric('commitment_created', 1);

  // GOOD - Always sent to Sentry as an info-level event
  logBusinessEvent('commitment_created', {
    commitmentId,
    userId,
    amount,
    currency,
  });
  ```
  - Use `logBusinessEvent` for: `commitment_created`, `account_deleted`, `lifeline_used`, `admin_refund_success`, `reaper_run_complete`, `push_notification_batch`
  - Use breadcrumbs only for debugging context that supplements error reports
- **Sentry Sampling Rate:** ALWAYS use `tracesSampleRate: 0.1` (10%) in production. Using `1.0` (100%) will exhaust Sentry quota and cause rate limiting.
  ```typescript
  // BAD - Will exhaust quota
  Sentry.init({
    tracesSampleRate: 1.0,
  });

  // GOOD - Sustainable for production
  Sentry.init({
    tracesSampleRate: 0.1, // 10% of transactions
  });
  ```
- **Sentry PII Policy:** NEVER log user email addresses in Sentry. Use `user.id` only for user identification. This applies to breadcrumbs, captureMessage extra data, and error context.
  ```typescript
  // BAD - PII violation
  addBreadcrumb('Admin action', 'admin', { email: user.email });
  captureException(error, { extra: { adminEmail: user.email } });

  // GOOD - Privacy compliant
  addBreadcrumb('Admin action', 'admin', { userId: user.id });
  captureException(error, { userId: user.id });
  ```
- **Supabase CLI Edge Functions Deploy:** The `supabase functions deploy --all` flag does NOT exist. Deploy functions individually using a loop:
  ```bash
  # BAD - Will fail with "unknown flag: --all"
  supabase functions deploy --all

  # GOOD - Deploy each function individually
  for func in admin-actions create-commitment delete-account isbn-lookup process-expired-commitments send-push-notification use-lifeline; do
    supabase functions deploy $func
  done
  ```
- **Maestro iOS Driver Timeout:** When Maestro fails with "iOS driver not ready in time" even with simulator running, kill stale processes and use extended timeout:
  ```bash
  # Kill existing Maestro/XCTest processes
  pkill -f maestro; pkill -f XCTestRunner

  # Run with extended timeout (180 seconds)
  MAESTRO_DRIVER_STARTUP_TIMEOUT=180000 ~/.maestro/bin/maestro test .maestro/smoke_test.yaml
  ```
  Note: Maestro CLI may not be in PATH by default. Use full path `~/.maestro/bin/maestro` if needed.
- **DateUtils for Timestamps (CRITICAL):** NEVER use raw `new Date()` for creating timestamps or date comparisons in business logic. Always use helpers from `src/lib/DateUtils.ts`:
  ```typescript
  // BAD - timezone bugs, device time manipulation
  completed_at: new Date().toISOString()
  const today = new Date().toISOString().split('T')[0]

  // GOOD - centralized UTC handling
  import { getNowUTC, getTodayUTC, getYesterdayUTC } from '../lib/DateUtils';
  completed_at: getNowUTC()
  const today = getTodayUTC()
  ```
  - `getNowUTC()`: Returns current time as ISO string (for DB timestamps)
  - `getNowDate()`: Returns current time as Date object (for calculations)
  - `getTodayUTC()`: Returns today's date as YYYY-MM-DD string
  - `getYesterdayUTC()`: Returns yesterday's date as YYYY-MM-DD string
  - Note: `new Date()` is fine for relative calculations (e.g., "30 days ago"), but NOT for creating stored timestamps.
- **Theme Colors in titan.ts:** The app uses `titanColors` from `src/theme/titan.ts` (exported via `src/theme/index.ts`). When adding new theme colors, add them to `titan.ts`, NOT `colors.ts`:
  ```typescript
  // In src/theme/titan.ts
  export const titanColors = {
    // ...existing colors...
    tag: {
      purple: '#8B5CF6',
      pink: '#EC4899',
    },
  };
  ```
  The `colors.ts` file exists for legacy compatibility but `titanColors` is the primary theme source.
- **React Navigation Screen Tracking (CRITICAL):** NEVER use `useNavigationState` hook for top-level analytics/screen tracking. PostHog's `captureScreens: true` also uses this hook internally and causes errors. Instead, use the `onStateChange` callback on `NavigationContainer`:
  ```typescript
  // BAD - useNavigationState error, hook called outside Navigator hierarchy
  function ScreenTracker() {
    const routeName = useNavigationState(state => state.routes[state.index].name);
    // Error: useNavigationState must be inside a Navigator
  }

  // BAD - PostHog captureScreens causes same error internally
  <PHProvider autocapture={{ captureScreens: true }}>

  // GOOD - Use onStateChange callback with navigationRef
  import { useNavigationContainerRef } from '@react-navigation/native';
  import { trackScreenView } from '../lib/AnalyticsService';

  function AppNavigatorInner() {
    const navigationRef = useNavigationContainerRef();
    const routeNameRef = useRef<string | null>(null);

    return (
      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          const currentRouteName = getActiveRouteName(navigationRef.getRootState());
          if (currentRouteName && currentRouteName !== routeNameRef.current) {
            trackScreenView(currentRouteName);
          }
          routeNameRef.current = currentRouteName;
        }}
      >
        {/* children */}
      </NavigationContainer>
    );
  }
  ```
  - Always set `captureScreens: false` in PostHog config
  - Use `AnalyticsService.trackScreenView()` for manual screen tracking
  - The `onStateChange` callback fires after navigation state updates, avoiding hook timing issues
- **expo-image vs react-native Image:** `expo-image` does NOT support `blurRadius`. For components that need blur effects (e.g., blurred background images), keep using `Image` from `react-native`. Only use `expo-image` for standard image display with caching benefits.
  ```typescript
  // GOOD - expo-image for normal images
  import { Image } from 'expo-image';
  <Image source={{ uri }} contentFit="cover" cachePolicy="memory-disk" />

  // GOOD - react-native Image for blur effects
  import { Image } from 'react-native';
  <Image source={{ uri }} blurRadius={25} />
  ```
- **i18n Key Duplication Prevention:** When adding new i18n keys, ALWAYS search for existing keys first using `grep '"key_name":' src/i18n/locales/`. Duplicate keys in JSON cause the last occurrence to silently override previous ones, leading to inconsistent behavior.
- **Multi-Stack Screen Registration:** When a screen can be accessed from BOTH onboarding AND main app flows (e.g., ManualBookEntry), register it in ALL relevant navigation stacks in `AppNavigator.tsx`. The app has 3 conditional stack groups:
  1. `!session` (unauthenticated): Onboarding0-13, WarpTransition, Auth
  2. `!isSubscribed` (authenticated, not subscribed): Onboarding7-13, MainTabs
  3. `isSubscribed` (authenticated, subscribed): MainTabs

  If a screen is only registered in one group, navigating to it from another group causes `"NAVIGATE" action ... not handled` error.
- **Search Results CTA Visibility:** For search results with a "Can't find? Add manually" type CTA button, use `FlatList` with `ListFooterComponent` instead of conditional rendering below the list. This ensures the CTA is always visible regardless of result count:
  ```typescript
  // BAD - Button disappears based on conditions
  {searchResults.length > 0 && (
    <View>{searchResults.map(...)}</View>
    <ManualEntryButton />
  )}
  {searchResults.length === 0 && <ManualEntryButton />}

  // GOOD - Footer always visible when query exists
  <FlatList
    data={searchResults}
    ListEmptyComponent={<NoResultsMessage />}
    ListFooterComponent={
      searchQuery.length > 0 ? <ManualEntryButton /> : null
    }
    contentContainerStyle={{ paddingBottom: 150 }}
  />
  ```
- **Multi-Flow Screen Navigation Pattern:** When a screen can be reached from multiple flows (onboarding vs main app), accept a `fromOnboarding` route param to determine the navigation destination after completion:
  ```typescript
  export default function SharedScreen({ navigation, route }: any) {
    const { fromOnboarding, otherData } = route.params || {};

    const handleComplete = () => {
      if (fromOnboarding) {
        navigation.navigate('OnboardingNextStep', { data });
      } else {
        navigation.navigate('MainAppScreen', { data });
      }
    };
  }
  ```
- **Edge Function Gateway JWT Verification (CRITICAL):** When deploying Edge Functions that handle their own JWT verification via `auth.getUser()`, use `--no-verify-jwt` flag. Supabase Gateway may reject valid ES256 tokens before the function code executes.
  ```bash
  # BAD - Gateway rejects ES256 JWT with "Invalid JWT"
  supabase functions deploy create-commitment

  # GOOD - Skip gateway verification, rely on internal auth.getUser()
  supabase functions deploy create-commitment --no-verify-jwt
  ```
  - Gateway errors have format `{"code":401,"message":"Invalid JWT"}`
  - Function code errors have format `{"success": false, "error": "ERROR_CODE", "details": "..."}`
  - If you see the gateway format, the function code never executed
- **FunctionsHttpError Handling Pattern:** When using `supabase.functions.invoke()`, always check for `FunctionsHttpError` and extract the full error body to understand the actual error:
  ```typescript
  import { FunctionsHttpError } from '@supabase/supabase-js';

  const { data, error } = await supabase.functions.invoke('my-function', { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const errorBody = await error.context.json();
        console.error('Full error body:', JSON.stringify(errorBody));
        // errorBody may have: { code, message } (Gateway) or { success, error, details } (Function)
      } catch {
        const errorText = await error.context.text();
        console.error('Error response (text):', errorText);
      }
    }
    throw error;
  }
  ```
- **React Navigation v7 Tab Re-tap (CRITICAL):** By default, tapping the same tab does NOT reset the stack to the first screen. You MUST add `screenListeners` to `Tab.Navigator`:
  ```typescript
  <Tab.Navigator
    screenListeners={({ navigation, route }) => ({
      tabPress: () => {
        const state = navigation.getState();
        const currentRoute = state.routes[state.index];
        if (route.key === currentRoute?.key) {
          // Already on this tab, navigate to first screen
          const screenMap: Record<string, string> = {
            HomeTab: 'Dashboard',
            MonkModeTab: 'MonkMode',
            LibraryTab: 'Library',
            SettingsTab: 'Settings',
          };
          navigation.navigate(route.name, { screen: screenMap[route.name] });
        }
      },
    })}
  >
  ```
- **TouchableOpacity hitSlop for Icon Buttons:** Small icon buttons (24x24px) are hard to tap accurately. Always add `hitSlop` and padding:
  ```typescript
  <TouchableOpacity
    onPress={onPress}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    style={{ padding: 4 }}
  >
    <Ionicons name="arrow-back" size={24} />
  </TouchableOpacity>
  ```
- **Web Portal Stripe Client:** In `commit-app-web`, NEVER create new Stripe instances with explicit `apiVersion`. Always use the centralized instance from `@/lib/stripe/server`:
  ```typescript
  // BAD - TypeScript version mismatch errors
  import Stripe from 'stripe';
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia', // May conflict with installed types
  });

  // GOOD - use centralized instance
  import { stripe } from '@/lib/stripe/server';
  await stripe.paymentMethods.detach(paymentMethodId);
  ```
- **Vercel Environment Variables (CRITICAL):** `.env.local` is NOT deployed to Vercel production. `NEXT_PUBLIC_*` variables MUST be added via CLI:
  ```bash
  # Add environment variable to production
  echo "pk_test_xxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

  # Verify it's set
  npx vercel env ls

  # Redeploy to pick up new variables
  npx vercel --prod --yes
  ```
- **adjustsFontSizeToFit with Dynamic numberOfLines:** When using `adjustsFontSizeToFit` on Text components, `numberOfLines` must match the actual line count in the text. For i18n strings that may contain explicit `\n`, calculate dynamically:
  ```typescript
  // BAD - fixed numberOfLines ignores explicit line breaks in translations
  <Text adjustsFontSizeToFit numberOfLines={2}>
    {i18n.t('title')}  // May have \n in Japanese but not English
  </Text>

  // GOOD - dynamic calculation respects translation structure
  <Text
    adjustsFontSizeToFit
    numberOfLines={title.split('\n').length}
  >
    {title}
  </Text>
  ```
  - Without `numberOfLines`, `adjustsFontSizeToFit` has no effect
  - Fixed values like `numberOfLines={2}` may cause text to wrap incorrectly if the translation has explicit `\n`
- **Text Visibility on Dynamic Image Backgrounds (CRITICAL):** For text overlaid on book covers or user-uploaded images (HeroBillboard, Archive), use a multi-layer approach to guarantee readability regardless of image brightness:
  ```typescript
  // Layer 1: Darken the background image
  coverImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 6, 4, 0.45)', // 45% dark overlay
  }

  // Layer 2: Text backdrop gradient (behind text container)
  <LinearGradient
    colors={[
      'transparent',
      'rgba(0, 0, 0, 0.4)',
      'rgba(0, 0, 0, 0.6)',
      'rgba(0, 0, 0, 0.4)',
      'transparent',
    ]}
    locations={[0, 0.2, 0.5, 0.8, 1]}
    style={styles.titleBackdrop}
  />

  // Layer 3: Bold text with strong black shadow
  title: {
    fontWeight: '600',        // Bold, not ultra-thin
    color: '#FFFFFF',         // Pure white
    textShadowColor: 'rgba(0, 0, 0, 1)',  // Solid black shadow
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  }
  ```
  - DO NOT use `fontWeight: '100'` (ultra-thin) for text on dynamic backgrounds - visibility is unpredictable
  - DO NOT use white/orange text shadows on dynamic backgrounds - only black shadows provide consistent contrast
  - The 3-layer approach (overlay + backdrop + shadow) ensures readability on any image
- **Subscription vs Penalty Architecture (CRITICAL):** This app has TWO separate payment systems. NEVER confuse them:
  ```
  ┌────────────────────────────────────────────────────────────────┐
  │ サブスクリプション (月額/年額課金)                              │
  │ ────────────────────────────────────────────────────────────── │
  │ 実装: Apple IAP / Google Play Billing (ネイティブ)             │
  │ 解約: ストアアプリから (設定 > サブスクリプション)               │
  │ 理由: App Store Guidelines 3.1.1 - デジタル商品はIAP必須       │
  ├────────────────────────────────────────────────────────────────┤
  │ ペナルティ (寄付/読めなかった時の課金)                          │
  │ ────────────────────────────────────────────────────────────── │
  │ 実装: Stripe via Web Portal (/billing)                        │
  │ 理由: 物理的な行為(読書)に紐づく課金はIAP対象外                  │
  │ 用途: カード登録、ペナルティ課金、カード管理                     │
  └────────────────────────────────────────────────────────────────┘
  ```
  - **NEVER implement subscription cancellation in Web Portal** - users cancel via App Store/Play Store
  - `subscription_status` is a **state flag** managed by Apple/Google webhooks, NOT a Stripe subscription
  - Web Portal `/billing` is ONLY for penalty payment card management
  - `react-native-iap` or `expo-in-app-purchases` should be used for subscription purchases
