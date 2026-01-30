# Skill Management Policy

## スキルの発見
タスク開始前に `.claude/skills/` を確認し、該当スキルがあれば使用を提案する。

## スキルの自動提案
以下の状況では、対応するスキルの使用を提案すること:

| 状況 | 提案するスキル |
|------|----------------|
| TypeScriptエラー発生 | `/typecheck` |
| UI文言追加・i18n作業 | `/i18n-check` |
| iOSビルド・動作確認 | `/build-ios` |
| DB/Edge Functionデプロイ | `/deploy-supabase` |

## スキルの自動作成
同じパターンの作業を3回以上行った場合:
1. 「このパターンをスキル化しますか？」と提案
2. 承認されたら `.claude/skills/` に SKILL.md を作成
3. このセクションの一覧を更新

## 現在のスキル一覧

| コマンド | 用途 | いつ使う |
|----------|------|----------|
| `/typecheck` | 型エラー自走修正 | TSエラー発生時、コミット前 |
| `/i18n-check` | 3言語同期チェック | UI文言追加後、リリース前 |
| `/build-ios` | iOSビルド自走 | 動作確認時、ネイティブモジュール追加後 |
| `/deploy-supabase` | 本番デプロイ | DB変更後、Edge Function修正後 |
| `/save-knowledge` | ナレッジ保存 | 有益なツイート・記事を見つけた時 |

## Tech Knowledge Policy
- 開発手法・ツール・アーキテクチャの質問時は `mcp__memory__search_nodes` でTech系ナレッジを検索してから回答
- 蓄積されたナレッジがあれば優先的に参照

---

# Claude Teacher Policy

プロジェクトごとに、詳細な **FORKG.md** ファイルを作成し、プロジェクト全体を平易な言葉で解説する。

## 含めるべき内容

1. **技術アーキテクチャ** - システム全体の設計思想と構成
2. **コードベースの構造** - 各部分がどのように接続され、データがどう流れるか
3. **使用技術** - なぜこれらの技術を選んだのか、他の選択肢との比較
4. **技術的意思決定** - トレードオフと、その判断に至った理由
5. **学べる教訓**:
   - 遭遇したバグとその解決方法
   - 潜在的な落とし穴と回避策
   - 新しく使った技術の実践知
   - 優れたエンジニアの思考プロセスと作業方法
   - ベストプラクティスとアンチパターン

## 書き方のスタイル

- 退屈な技術ドキュメントや教科書のようにしない
- アナロジー（例え話）とエピソードを使って理解しやすく、記憶に残るようにする
- 読んでいて面白いと思える、エンゲージングな文章を心がける
- 「なぜそうなったか」のストーリーを大切にする

---

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
- **Supabase Null Safety (CRITICAL):** The `supabase` variable can be `null` when environment variables are missing. Before calling `supabase.channel()`, `supabase.from()`, `supabase.auth.*`, etc., ALWAYS check `isSupabaseInitialized()`:
  ```typescript
  import { supabase, isSupabaseInitialized } from '../lib/supabase';

  // In useEffect or function
  if (!isSupabaseInitialized()) {
    console.warn('Supabase not initialized, skipping');
    return; // Or return safe default value
  }

  const { data } = await supabase.from('table').select();
  ```
  - **Files that MUST have protection:** `AppNavigator.tsx`, `UnreadContext.tsx`, `UnreadService.ts`, and any new Context/Service using Supabase
  - **Build #41 Success Factor:** Adding `isSupabaseInitialized()` check to `UnreadContext.tsx` and `UnreadService.ts` resolved the TestFlight freeze issue
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
- **Stack-First Screen Gesture Guard (GO_BACK Prevention):** The first screen in each conditional Stack.Navigator group MUST have `options={{ gestureEnabled: false }}`. iOS swipe-back gesture on the first screen of a stack triggers `GO_BACK not handled` because there is no previous screen to navigate to. Additionally, any call to `navigation.goBack()` MUST be wrapped with `navigation.canGoBack()` check:
  ```typescript
  // Stack registration - disable swipe on first screen
  <Stack.Screen name="FirstScreen" component={...} options={{ gestureEnabled: false }} />

  // Back button handler - always check canGoBack
  onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }}
  ```
  Current stack-first screens with `gestureEnabled: false`:
  - `Onboarding0` (unauthenticated stack)
  - `Onboarding7` (authenticated, not subscribed stack)
- **Reanimated withDelay Reliability:** `withDelay` may fail to trigger in complex animation sequences. For critical timing (e.g., cinematic reveals), use `setTimeout` to control when animations start, then call `withTiming` directly inside the callback:
  ```typescript
  // UNRELIABLE:
  opacity.value = withDelay(1000, withTiming(1, { duration: 800 }));

  // RELIABLE:
  setTimeout(() => {
    opacity.value = withTiming(1, { duration: 800 });
  }, 1000);
  ```
- **Reanimated withRepeat(-1) Cleanup (CRITICAL):** When using `withRepeat(-1)` (infinite loop) inside `useEffect`, ALWAYS add a cleanup function that calls `cancelAnimation()` on ALL animated SharedValues. Without cleanup, infinite animations persist after component unmount, causing navigation errors ("GO_BACK not handled") and memory leaks:
  ```typescript
  // BAD - animation persists after unmount, causes navigation crashes
  useEffect(() => {
    x.value = withRepeat(withSequence(...), -1, true);
    y.value = withRepeat(withSequence(...), -1, true);
  }, []);

  // GOOD - cleanup cancels animations on unmount
  useEffect(() => {
    x.value = withRepeat(withSequence(...), -1, true);
    y.value = withRepeat(withSequence(...), -1, true);

    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
    };
  }, []);
  ```
  - Import `cancelAnimation` from `react-native-reanimated`
  - Also recommended for finite `withRepeat(N)` if the animation duration is long (prevents stale callbacks on quick unmount)
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
  - **Search vs Individual Lookup Inconsistency (CRITICAL):** Google Books Search API (`/volumes?q=...`) and Individual Lookup API (`/volumes/{id}`) may return DIFFERENT `pageCount` values for the same book (different editions, metadata discrepancies). When validating page counts server-side, ALWAYS trust the client-provided value (from search results) rather than re-fetching:
    ```typescript
    // BAD - re-fetch may return different pageCount
    const bookPageCount = await fetchBookPageCount(google_books_id);
    if (target_pages > bookPageCount) return error;

    // GOOD - trust client-provided value, use API as fallback only
    const bookPageCount = book_total_pages ?? await fetchBookPageCount(google_books_id);
    if (target_pages > bookPageCount + BUFFER) return error;
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
  3. **CRITICAL:** `.env.local` is NOT deployed. Set env vars via CLI. Use `printf '%s'` (NOT `echo`) to avoid trailing newline which causes signature verification failures:
     ```bash
     printf '%s' 'VALUE' | npx vercel env add VAR_NAME production
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
- **Vercel Environment Variables (CRITICAL):** `.env.local` is NOT deployed to Vercel production. `NEXT_PUBLIC_*` variables MUST be added via CLI. Use `printf '%s'` (NOT `echo`) to avoid trailing newline:
  ```bash
  # Add environment variable to production (printf avoids trailing newline)
  printf '%s' 'pk_test_xxx' | npx vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

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
- **Admin-Only Tables RLS Pattern (CRITICAL):** When creating tables that only admins should write to (e.g., `donations`, `announcements`), do NOT rely on comments like "service_role can modify". The Web Portal's Admin Dashboard uses authenticated user sessions (NOT service_role). You MUST:
  1. Create explicit RLS policies checking `users.role = 'Founder'` for INSERT/UPDATE/DELETE
  2. Ensure the admin user's `role` column is actually set to `'Founder'` in the database
  3. If using client-side Supabase calls (not Edge Functions), RLS policies are ALWAYS enforced
  ```sql
  -- Example: Admin INSERT policy
  CREATE POLICY "Admin can insert"
    ON my_table FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Founder'
      )
    );
  ```
- **TypeScript Types vs DB Schema Sync:** When manually editing `src/types/database.types.ts`, ensure column names and types EXACTLY match the actual database schema. Mismatches cause runtime errors like "Could not find column X in schema cache". Always verify with the corresponding migration file in `supabase/migrations/`.
- **Supabase Auto-Managed Secrets:** Secrets prefixed with `SUPABASE_` cannot be set via `supabase secrets set`. They are automatically managed by Supabase and updated when rotated in the Dashboard.
  ```bash
  # BAD - Will fail with "Env name cannot start with SUPABASE_"
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY='...'

  # These secrets are auto-managed:
  # - SUPABASE_SERVICE_ROLE_KEY
  # - SUPABASE_ANON_KEY
  # - SUPABASE_URL
  # - SUPABASE_DB_URL
  ```
  When rotating `SERVICE_ROLE_KEY`:
  1. Regenerate in Supabase Dashboard (Settings > API > service_role)
  2. Edge Functions: **Automatically updated** (no action needed)
  3. Vercel (Web Portal): **Manual update required** (use `printf` to avoid trailing newline)
     ```bash
     printf '%s' 'NEW_KEY' | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
     npx vercel --prod --yes  # Redeploy
     ```
- **Stripe Zero-Decimal Currency Handling (CRITICAL):** Stripe uses the smallest currency unit (cents for USD, yen for JPY). JPY is a "zero-decimal currency" where the amount is passed directly. USD/EUR/GBP must be multiplied by 100. ALWAYS use the `toStripeAmount()` helper:
  ```typescript
  const ZERO_DECIMAL_CURRENCIES = [
    'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
    'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
  ];

  function toStripeAmount(amount: number, currency: string): number {
    if (ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100); // Convert to cents
  }

  // BAD - $20 becomes $0.20 (99% undercharge!)
  amount: pledgeAmount,

  // GOOD - $20 becomes 2000 cents
  amount: toStripeAmount(pledgeAmount, currency),
  ```
  - This applies to ALL Stripe operations: PaymentIntent creation, refunds, amount displays
  - When displaying amounts FROM Stripe, reverse the conversion (divide by 100 for non-zero-decimal)
- **Admin Multi-Layer Authorization (CRITICAL):** Admin endpoints MUST verify authorization using BOTH email whitelist AND database role check. Email-only verification is vulnerable to email spoofing:
  ```typescript
  // Layer 1: Valid JWT (handled by Supabase)
  const { data: { user } } = await supabase.auth.getUser();

  // Layer 2: Email Whitelist
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return errorResponse(403, 'FORBIDDEN');
  }

  // Layer 3: Database Role Verification (CRITICAL!)
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userRecord?.role !== 'Founder') {
    return errorResponse(403, 'FORBIDDEN', 'User does not have admin role');
  }
  ```
  - NEVER rely on email whitelist alone - emails can be spoofed
  - Always log unauthorized access attempts to Sentry for security monitoring
- **Refund 3-Phase Transaction Pattern (CRITICAL):** When performing financial operations that span DB and external services (Stripe), use the 3-phase pattern to maintain consistency:
  ```typescript
  // Phase 1: Mark DB as "pending" BEFORE external call
  await supabase.from('penalty_charges').update({
    charge_status: 'refund_pending',
  }).eq('id', chargeId);

  // Phase 2: External service call (Stripe)
  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
    }, {
      idempotencyKey: `refund_${chargeId}`, // Prevent duplicates!
    });
  } catch (error) {
    // REVERT: External call failed, restore original status
    await supabase.from('penalty_charges').update({
      charge_status: 'succeeded', // Revert to original
    }).eq('id', chargeId);
    throw error;
  }

  // Phase 3: Mark DB as "complete" AFTER successful external call
  await supabase.from('penalty_charges').update({
    charge_status: 'refunded',
  }).eq('id', chargeId);
  ```
  - The intermediate "pending" state allows manual investigation if Phase 3 fails
  - ALWAYS use idempotency keys for Stripe operations to prevent duplicate charges
- **Lifeline Dual Limit Pattern:** When implementing user-benefiting features that could be abused, apply dual limits:
  ```typescript
  // Limit 1: Per-resource limit (once per book)
  if (commitment.is_freeze_used) {
    return errorResponse(400, 'LIFELINE_ALREADY_USED');
  }

  // Limit 2: Global cooldown (once per 30 days across ALL resources)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentUsage } = await supabase
    .from('commitments')
    .select('id')
    .eq('user_id', userId)
    .eq('is_freeze_used', true)
    .gte('updated_at', thirtyDaysAgo)
    .limit(1);

  if (recentUsage && recentUsage.length > 0) {
    return errorResponse(400, 'GLOBAL_COOLDOWN_ACTIVE');
  }
  ```
  - Per-resource limits prevent repeated abuse on the same item
  - Global cooldowns prevent abuse by creating many resources
  - Both limits are checked server-side (Edge Function) - never trust client
- **DateTimePicker Date-Only Selection (CRITICAL):** When using `@react-native-community/datetimepicker` with `mode="date"`, iOS may return the time as local midnight (00:00:00). For deadline inputs where server validates "X hours in future", set the time to end of day:
  ```typescript
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      // Set to end of day to maximize available time
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      setDeadline(endOfDay);
    }
  };
  ```
- **Client-Server Validation Alignment (CRITICAL):** Client-side validation MUST match or be stricter than server-side validation. Never rely on server errors for UX - prevent them client-side:
  ```typescript
  // BAD - Client allows, server rejects → poor UX
  // Client: deadline > now
  // Server: deadline > now + 24 hours

  // GOOD - Client matches server
  const minDeadline = new Date(getNowDate().getTime() + 24 * 60 * 60 * 1000);
  if (deadline < minDeadline) {
    Alert.alert(i18n.t('common.error'), i18n.t('errors.validation.DEADLINE_TOO_SOON'));
    return;
  }
  ```
  - Also add buffer to `minimumDate` prop (+25 hours instead of +24) to account for form fill time
- **Edge Function JSON Parse (CRITICAL):** ALWAYS wrap `req.json()` in try-catch in Edge Functions. Invalid JSON will throw and crash the function without proper error response:
  ```typescript
  // BAD - crashes on invalid JSON
  const { field } = await req.json();

  // GOOD - returns proper 400 error
  let body: RequestType;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const { field } = body;
  ```
- **Edge Function Environment Variables (CRITICAL):** ALWAYS validate required environment variables before using them. Empty strings from `Deno.env.get()` will cause silent failures:
  ```typescript
  // BAD - empty string passed to createClient causes cryptic errors
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // GOOD - fail fast with clear error
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'CONFIGURATION_ERROR' }),
      { status: 500, headers: corsHeaders }
    );
  }
  ```
- **captureError Function Signature:** When using `captureError` from `src/utils/errorLogger.ts`, use the correct signature with `location` property (format: `'ScreenName.functionName'`). Do NOT use `context` or `screen` properties:
  ```typescript
  import { captureError } from '../utils/errorLogger';

  // BAD - TypeScript error: 'context' and 'screen' don't exist
  captureError(error, { context: 'fetchData', screen: 'DashboardScreen' });

  // GOOD - correct signature
  captureError(error, { location: 'DashboardScreen.fetchData' });

  // GOOD - with optional extra data
  captureError(error, {
    location: 'BookDetailScreen.handleSave',
    extra: { bookId, commitmentId },
  });
  ```
  - The `location` format should be `ScreenName.functionName` for easy debugging
  - Optional `extra` object for additional context (no PII - use IDs, not emails)
  - Optional `level` for severity (`'error'`, `'warning'`, `'info'`)
- **typography.fontSize Available Properties:** The `typography.fontSize` object only has these properties: `headingLarge`, `headingMedium`, `headingSmall`, `body`, `bodySmall`, `caption`, `button`. Do NOT use `bodyLarge` or `small` (they don't exist):
  ```typescript
  // BAD - these don't exist
  typography.fontSize.bodyLarge
  typography.fontSize.small

  // GOOD - use correct properties
  typography.fontSize.body      // 17px - for normal body text
  typography.fontSize.bodySmall // 15px - for smaller body text
  typography.fontSize.caption   // 14px - for captions and small labels
  ```
- **expo-image Source Null Handling:** `expo-image`'s `source` prop does NOT accept `null`, only `string | undefined`. When using with nullable URLs, use null coalescing:
  ```typescript
  // BAD - TypeScript error: null not assignable
  <Image source={{ uri: someNullableUrl }} />

  // GOOD - convert null to undefined
  <Image source={{ uri: someNullableUrl ?? undefined }} />
  ```
- **Onboarding totalSteps Consistency:** When adding/removing onboarding screens, update `totalSteps` in ALL onboarding screens (currently 15 steps, screens 0-14). Also update `currentStep` for each subsequent screen. The screens are:
  - 0: Welcome
  - 1: TsundokuCount
  - 2: JobCategory (inserted 2026-01-22)
  - 3: LastRead
  - 4: BookSelect
  - 5: Deadline
  - 6: Penalty
  - 7: Account
  - 8: OpportunityCost
  - 9: Stats
  - 10: HowItWorks
  - 11: Authority
  - 12: Testimonials
  - 13: CustomPlan
  - 14: Paywall
- **app.json iOS Permission Locales (CRITICAL):** `app.json` の `plugins` セクション内の権限文言（`photosPermission`, `cameraPermission`）は**英語をfallback**として記述する。日本語・韓国語は `locales/*.json` で対応。また、`app.json` の `locales` セクションにはアプリがサポートする**全言語**（ja, en, ko）を登録し、各ファイルを `locales/` ディレクトリに配置すること：
  ```json
  // app.json - plugins内は英語fallback
  ["expo-image-picker", { "photosPermission": "Allow access to..." }]

  // app.json - 全言語を登録
  "locales": { "ja": "./locales/ja.json", "en": "./locales/en.json", "ko": "./locales/ko.json" }

  // locales/ja.json - iOS権限ダイアログの日本語
  { "NSPhotoLibraryUsageDescription": "...", "NSCameraUsageDescription": "..." }
  ```
  新しい言語を追加する場合は、必ず `locales/XX.json` と `app.json` の `locales` の両方を更新する。
- **setUserContext Signature:** `setUserContext(userId: string)` はID**のみ**を受け取る。emailは渡さない（Sentry PII規約）。呼び出し側で `session.user.email` を引数に含めないこと。
- **database.types.ts NULL→NOT NULL変更時 (CRITICAL):** カラムを `string | null` → `string` に変更する場合、**全ての** `insert` / `upsert` 呼び出しでそのフィールドが必須になる。変更前に必ず `grep "\.from('TABLE_NAME').*\.(insert|upsert)" src/` で全呼び出し元を確認し、fallback値を追加すること。TypeScriptは`Insert`型で必須フィールドの欠落を検出する。
- **Supabase RPC関数の型登録:** `CREATE OR REPLACE FUNCTION` でRPC関数を追加した場合、`src/types/database.types.ts` の `Functions` セクションにも型定義を追加すること。未登録の場合、`supabase.rpc('function_name')` で `Argument of type '"function_name"' is not assignable to parameter of type 'never'` エラーになる：
  ```typescript
  // src/types/database.types.ts の Functions セクション
  Functions: {
    my_rpc_function: {
      Args: {
        p_param1: string
        p_param2?: string | null
      }
      Returns: boolean
    }
  }
  ```
- **Username Validation Rules:** ユーザー名は `^[a-zA-Z0-9_]{3,20}$` (3-20文字、英数字+アンダースコア)。バリデーションには `src/utils/usernameValidator.ts` の `validateUsernameFormat()` と `checkUsernameAvailability()` を使用すること。DB側にもCHECK制約とcase-insensitive UNIQUE INDEXが存在する。
- **JSON.parse with Record<string, unknown> Type Narrowing:** `JSON.parse` の結果を `Record<string, unknown>` で型付けした場合、プロパティアクセスは `unknown` 型になる。使用前に型ガードが必須:
  ```typescript
  // BAD - TypeScript error: unknown is not assignable to string
  let data: Record<string, unknown> = {};
  data = JSON.parse(jsonString);
  const username = data.username; // 型: unknown
  doSomething(username); // Error!

  // GOOD - 型ガードで絞り込み
  if (typeof data.username !== 'string') return;
  doSomething(data.username); // OK: string型
  ```
- **Supabase Migration Column Safety:** マイグレーションで列の存在が保証されない場合（異なる環境間での履歴差異）、`DO $$ IF EXISTS ... END $$` ブロックでラップする:
  ```sql
  -- BAD - 列が存在しないとエラー
  CREATE INDEX idx_foo ON table(maybe_missing_column);

  -- GOOD - 条件付き実行
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'table' AND column_name = 'maybe_missing_column'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_foo ON table(maybe_missing_column);
    END IF;
  END $$;
  ```
- **Supabase Migration Ordering with --include-all:** ローカルマイグレーションのタイムスタンプがリモートの最新より前の場合、`supabase db push` は失敗する。`--include-all` フラグを使用:
  ```bash
  # エラー: "Found local migration files to be inserted before the last migration"
  # 解決:
  supabase db push --include-all
  ```
- **Production console.log Policy:** 本番ビルドでの情報漏洩を防ぐため、認証・決済関連のデバッグログは `__DEV__` で条件分岐:
  ```typescript
  // BAD - 本番でもログ出力される
  console.log('Session:', session);
  console.log('Payment intent:', paymentIntent);

  // GOOD - 開発時のみ出力
  if (__DEV__) console.log('Session:', session?.user?.id);
  if (__DEV__) console.log('Payment processing...');
  ```
  - `captureError()` は本番でも使用可（Sentryに送信される）
  - 機密情報（トークン、パスワード、フルセッション）は `__DEV__` でも出力しない
- **Sentry Deno SDK in Edge Functions (CRITICAL):** Sentry Deno SDK (`https://deno.land/x/sentry@*/index.mjs`) causes `WORKER_ERROR` in Supabase Edge Functions. The SDK works in standard Deno but NOT in Deno Deploy (Edge Runtime). Do NOT use module-level imports:
  ```typescript
  // BAD - Crashes Edge Function with WORKER_ERROR
  import * as Sentry from "https://deno.land/x/sentry@8.42.0/index.mjs";

  // GOOD - Use no-op stubs until Sentry releases Edge-compatible SDK
  // See: supabase/functions/_shared/sentry.ts for implementation
  export function captureException(error: unknown) {
    console.error("[Sentry] Exception (SDK disabled):", error);
  }
  ```
  - Symptoms: Edge Function returns `{"code": 500, "message": "WORKER_ERROR"}` without executing function code
  - Current workaround: `_shared/sentry.ts` contains no-op stubs, errors logged to console (visible in Supabase Dashboard Logs)
  - TODO: Re-enable when Sentry releases Deno Edge Runtime compatible SDK
- **Edge Function Client-Side Retry (CRITICAL):** Supabase Edge Functions (Deno Deploy) have Cold Start issues that cause intermittent `WORKER_ERROR`. NEVER use `supabase.functions.invoke()` directly. Always use `invokeFunctionWithRetry()` from `src/lib/supabaseHelpers.ts`:
  ```typescript
  // BAD - WORKER_ERROR on Cold Start causes user-facing error
  const { data, error } = await supabase.functions.invoke('create-commitment', {
    body: requestBody,
  });

  // GOOD - Automatic retry with exponential backoff
  import { invokeFunctionWithRetry } from '../lib/supabaseHelpers';

  const { data, error } = await invokeFunctionWithRetry<{
    success: boolean;
    commitment_id: string;
  }>('create-commitment', requestBody);
  ```
  - Retries up to 3 times on WORKER_ERROR with exponential backoff (1s, 2s, 3s)
  - Logs retry attempts in development: `[create-commitment] Retry 1/3 after WORKER_ERROR`
  - All Edge Function calls in the codebase use this pattern:
    - `create-commitment` (OnboardingScreen13, CreateCommitmentScreen)
    - `use-lifeline` (CommitmentDetailScreen)
    - `delete-account` (SettingsScreen)
    - `isbn-lookup` (useBookSearch, BarcodeScannerModal)
    - `job-recommendations` (JobRecommendations, JobRankingScreen)
- **expo-splash-screen hideAsync() Required (CRITICAL):** `app.json` で splash screen を設定している場合、`SplashScreen.hideAsync()` を必ず呼ばないとアプリが永久に黒画面（またはsplash画面）のまま固まる。現在の実装パターン:
  ```javascript
  // App.js - モジュールレベルで呼ぶ
  import * as SplashScreen from 'expo-splash-screen';
  SplashScreen.preventAutoHideAsync();

  // AppNavigator.tsx - 認証チェック完了後に呼ぶ
  useEffect(() => {
    if (authState.status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [authState.status]);
  ```
  - `preventAutoHideAsync()` は App 関数の外（モジュールレベル）で呼ぶ
  - `hideAsync()` は認証状態の初期化完了後に呼ぶ（NavigationContent内）
  - TestFlightビルドで黒画面になる場合、まずこの呼び出しを確認すること
- **EAS Submit ascAppId (CRITICAL):** `eas submit --non-interactive` は `ascAppId` が `eas.json` に設定されていないと失敗する。Apple Developer Portalへのインタラクティブログインが不要になるよう、必ず設定すること:
  ```json
  // eas.json
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "6758319830"
      }
    }
  }
  ```
  - `ascAppId` は App Store Connect > アプリ > 一般情報 > Apple ID で確認
  - このプロジェクトの ascAppId: `6758319830`
- **withTimeout Nested Fallback (CRITICAL):** `withTimeout(innerFn(), timeout, fallback)` でラップする場合、`innerFn` 内部のフォールバック機構（キャッシュ読み込み、リトライ等）は外側タイムアウトが先に発火すると**実行されない**。外側フォールバック値にもキャッシュ等の適切な値を渡すこと:
  ```typescript
  // BAD - 内部のキャッシュフォールバックが無効化される
  const result = await withTimeout(
    checkUserStatus(userId),  // 内部にキャッシュフォールバックあり（最大13.5s）
    8000,                      // 外側8sが先にタイムアウト
    { isSubscribed: false },   // ハードコード値 → 既存ユーザーがOnboardingに戻される
    'checkUserStatus'
  );

  // GOOD - 外側フォールバックにもキャッシュを使用
  const cachedFallback = await getCachedUserStatus(userId);
  const result = await withTimeout(
    checkUserStatus(userId),
    8000,
    cachedFallback ?? { isSubscribed: false },  // キャッシュ優先
    'checkUserStatus'
  );
  ```
  - 原則: **「タイムアウトの入れ子」は外側が常に勝つ**
  - `withTimeout` のフォールバック値は「最悪ケースでユーザーに見せて良い値」であること
  - 認証状態のフォールバックは安全側（Onboarding表示）だが、キャッシュがあれば既存状態を優先
- **実機ビルド (expo run:ios) の制約 (CRITICAL):**
  - `expo prebuild` で生成されるiOSプロジェクトには `expo-dev-launcher` が含まれる
  - `--configuration Release` でも完全なproductionビルドにはならない（dev clientのまま）
  - Releaseビルドでもdev serverに接続しようとし、未接続だとスプラッシュ画面で停止する
  - **TestFlight/本番用**: `eas build --profile production` を使用（dev-launcher除外）
  - **ローカル実機テスト**: `--configuration Debug` + `npx expo start` でdev server接続が必要
  - dev server接続時、PCとiPhoneが**同じWi-Fi**であること。IPが変わった場合は手動入力
- **prebuild後の.xcode.env.local再パッチ (CRITICAL):**
  `rm -rf ios && npx expo prebuild --clean` を実行すると `.xcode.env.local` が初期化される。
  環境変数の `.env` ロードパッチを毎回再適用する必要がある:
  ```bash
  cat >> ios/.xcode.env.local << 'PATCH'
  # Load .env for Xcode direct builds
  if [ -f "$PROJECT_DIR/../../.env" ]; then
    set -a
    source "$PROJECT_DIR/../../.env"
    set +a
  fi
  PATCH
  ```
  `run-ios-manual.sh` にはこのパッチロジックが含まれているため、
  `./run-ios-manual.sh` 経由でビルドすれば自動適用される。
- **Sentry Source Map Upload in Local Builds:**
  ローカルのReleaseビルドでは `sentry-cli` のauth tokenが未設定のためuploadが失敗する。
  ローカルビルド時は環境変数で無効化:
  ```bash
  SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios --device <UDID> --configuration Release
  ```
- **iOS Codegen キャッシュ不整合:**
  `ios/build/generated/` のキャッシュが壊れると `rnworkletsJSI-generated.cpp` 等が見つからないエラーが発生。
  解決: `rm -rf ios && npx expo prebuild --clean` でクリーンリビルド。

---

# Troubleshooting: スプラッシュ画面フリーズ

## 症状
アプリ起動後、スプラッシュ画面（黒画面 or splash-icon）で永久に停止し、先に進まない。

## 根本原因
```
環境変数未設定 → env.ts で空文字列フォールバック → supabase.ts で createClient('', '') 実行
→ "supabaseUrl is required" エラー（未ハンドル） → JSランタイムフリーズ
→ SplashScreen.hideAsync() 未実行 → 永久フリーズ
```

## 解決策（コード修正済み - 2026-01-29）

### 1. supabase.ts の防御的初期化
```typescript
// src/lib/supabase.ts
function createSafeClient(): SupabaseClient<Database> | null {
  if (ENV_INIT_ERROR || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Supabase] Cannot initialize: missing credentials');
    return null;
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {...});
}

export const supabase = supabaseClient as SupabaseClient<Database>;
export const isSupabaseInitialized = (): boolean => supabaseClient !== null;
```

### 2. AppNavigator での初期化チェック
```typescript
// src/navigation/AppNavigator.tsx - initializeAuth()
if (ENV_INIT_ERROR) {
  setAuthState({ status: 'unauthenticated' });
  return;
}
if (!isSupabaseInitialized()) {
  setAuthState({ status: 'unauthenticated' });
  return;
}
```

### 3. セーフティタイマー（5秒）
```typescript
useEffect(() => {
  const safetyTimer = setTimeout(() => {
    SplashScreen.hideAsync();
    if (authState.status === 'loading') {
      setAuthState({ status: 'unauthenticated' });
    }
  }, 5000);  // 15秒→5秒に短縮
  return () => clearTimeout(safetyTimer);
}, []);
```

---

# EAS Build チェックリスト

## ビルド前の必須確認

### 1. EAS Secrets の確認
```bash
eas secret:list
```
**必須シークレット:**
| Secret Name | 用途 |
|-------------|------|
| EXPO_PUBLIC_SUPABASE_URL | Supabase接続URL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Supabase匿名キー |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe公開キー |
| EXPO_PUBLIC_GOOGLE_API_KEY | Google Books API |
| EXPO_PUBLIC_SENTRY_DSN | Sentryエラー監視 |
| EXPO_PUBLIC_POSTHOG_API_KEY | PostHog分析 |
| EXPO_PUBLIC_POSTHOG_HOST | PostHogホスト |

### 2. 不足シークレットの設定
```bash
# .env から値を取得して設定
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d '=' -f2)"
```

### 3. ビルド実行
```bash
# Production (TestFlight/App Store)
eas build --profile production --platform ios

# Preview (内部テスト用)
eas build --profile preview --platform ios
```

### 4. 月間ビルド上限に注意
無料プランは月間ビルド数に上限あり。上限到達時は月初リセットを待つか、プランアップグレード。

---

# ローカル実機ビルド チェックリスト

## 手順

### 1. クリーンprebuild（推奨）
```bash
rm -rf ios && npx expo prebuild --clean
```

### 2. .xcode.env.local パッチ
```bash
cat >> ios/.xcode.env.local << 'PATCH'
# Load .env for Xcode direct builds
if [ -f "$PROJECT_DIR/../../.env" ]; then
  set -a
  source "$PROJECT_DIR/../../.env"
  set +a
fi
PATCH
```
**注意:** `./run-ios-manual.sh` 使用時は自動適用される。

### 3. 接続デバイス確認
```bash
xcrun xctrace list devices 2>&1 | grep iPhone
# 出力例: iPhone (26.2) (00008120-001C29E12684201E)
```

### 4. ビルド＆インストール
```bash
npx expo run:ios --device <UDID>
```

### 5. インストールが止まった場合の手動インストール
```bash
# アプリのパスを確認
ls ~/Library/Developer/Xcode/DerivedData/COMMIT-*/Build/Products/Debug-iphoneos/

# 手動インストール
xcrun devicectl device install app --device <UDID> \
  ~/Library/Developer/Xcode/DerivedData/COMMIT-*/Build/Products/Debug-iphoneos/COMMIT.app

# アプリ起動
xcrun devicectl device process launch --device <UDID> com.kgxxx.commitapp
```

### 6. dev server 起動（別ターミナル）
```bash
npx expo start
```
**重要:** PCとiPhoneが**同じWi-Fi**に接続されていること。

---

## よくあるエラーと解決策

| エラー | 原因 | 解決策 |
|--------|------|--------|
| `safeareacontextJSI-generated.cpp not found` | Codegenキャッシュ破損 | `rm -rf ios && npx expo prebuild --clean` |
| `supabaseUrl is required` | 環境変数未設定 | EAS Secrets設定 or `.env` 確認 |
| `No devices are booted` | シミュレータ未起動 | `xcrun simctl boot "iPhone 17 Pro"` |
| `Invalid device or device pair` | デバイス名不正 | `xcrun simctl list devices` で確認 |
| `The item is not a valid bundle` | ビルド不完全 | DerivedData削除後、再ビルド |
| 月間ビルド上限到達 | EAS無料プラン制限 | 月初リセット待ち or プランアップグレード |
