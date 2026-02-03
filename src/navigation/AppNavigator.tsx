// URL Polyfill moved to index.js (must be first import in app entry point)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Image, ActivityIndicator, StyleSheet, DeviceEventEmitter, Platform, Linking, Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, AUTH_REFRESH_EVENT, isSupabaseInitialized } from '../lib/supabase';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY, ENV_INIT_ERROR } from '../config/env';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { AnalyticsProvider, useAnalytics } from '../contexts/AnalyticsContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { UnreadProvider, useUnread } from '../contexts/UnreadContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { OnboardingAtmosphereProvider } from '../context/OnboardingAtmosphereContext';
import { colors, typography } from '../theme';
import { NotificationService } from '../lib/NotificationService';
import i18n from '../i18n';
import { setUserContext, clearUserContext, captureError } from '../utils/errorLogger';
import { trackScreenView } from '../lib/AnalyticsService';

// 統一された認証状態型
type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: Session; isSubscribed: boolean; hasCompletedOnboarding: boolean; legalConsentVersion: string | null };

import { useBlockingStatus } from '../lib/RemoteConfigService';
import MaintenanceScreen from '../screens/blocking/MaintenanceScreen';
import ForceUpdateScreen from '../screens/blocking/ForceUpdateScreen';
import AuthScreen from '../screens/AuthScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import CreateCommitmentScreen from '../screens/CreateCommitmentScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VerificationScreen from '../screens/VerificationScreen';
import CommitmentDetailScreen from '../screens/CommitmentDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import DonationHistoryScreen from '../screens/DonationHistoryScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import MonkModeScreen from '../screens/monkmode/MonkModeScreen';
import MonkModeActiveScreen from '../screens/monkmode/MonkModeActiveScreen';
import ManualBookEntryScreen from '../screens/ManualBookEntryScreen';
import LegalConsentScreen from '../screens/LegalConsentScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import JobRankingScreen from '../screens/JobRankingScreen';
import JobCategorySettingsScreen from '../screens/JobCategorySettingsScreen';
import { needsLegalConsent, CURRENT_LEGAL_VERSION } from '../config/legalVersions';
import TabErrorBoundary from '../components/TabErrorBoundary';

// Onboarding screens
import OnboardingScreen0 from '../screens/onboarding/OnboardingScreen0_Welcome';
import OnboardingScreen1 from '../screens/onboarding/OnboardingScreen1_TsundokuCount';
import OnboardingJobCategory from '../screens/onboarding/OnboardingScreen1_5_JobCategory';
import OnboardingScreen2 from '../screens/onboarding/OnboardingScreen2_LastRead';
import OnboardingScreen3 from '../screens/onboarding/OnboardingScreen3_BookSelect';
import OnboardingScreen4 from '../screens/onboarding/OnboardingScreen4_Deadline';
import OnboardingScreen5 from '../screens/onboarding/OnboardingScreen5_Penalty';
import OnboardingScreen6 from '../screens/onboarding/OnboardingScreen6_Account';
import OnboardingScreen7 from '../screens/onboarding/OnboardingScreen7_OpportunityCost';
import OnboardingScreen8 from '../screens/onboarding/OnboardingScreen8_Stats';
import OnboardingScreen9 from '../screens/onboarding/OnboardingScreen9_HowItWorks';
import OnboardingScreen10 from '../screens/onboarding/OnboardingScreen10_Authority';
import OnboardingScreen11 from '../screens/onboarding/OnboardingScreen11_Testimonials';
import OnboardingScreen12 from '../screens/onboarding/OnboardingScreen12_CustomPlan';
import OnboardingScreen13 from '../screens/onboarding/OnboardingScreen13_Paywall';
import WarpTransitionScreen from '../screens/onboarding/WarpTransitionScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Home Stack Navigator
function HomeStackNavigator() {
  return (
    <TabErrorBoundary tabName="Home">
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="CreateCommitment" component={CreateCommitmentScreen} />
        <Stack.Screen name="ManualBookEntry" component={ManualBookEntryScreen} />
        <Stack.Screen name="CommitmentDetail" component={CommitmentDetailScreen} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="JobRanking" component={JobRankingScreen} />
      </Stack.Navigator>
    </TabErrorBoundary>
  );
}

// Library Stack Navigator
function LibraryStackNavigator() {
  return (
    <TabErrorBoundary tabName="Library">
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      </Stack.Navigator>
    </TabErrorBoundary>
  );
}

// Monk Mode Stack Navigator
function MonkModeStackNavigator() {
  return (
    <TabErrorBoundary tabName="MonkMode">
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MonkMode" component={MonkModeScreen} />
        <Stack.Screen name="MonkModeActive" component={MonkModeActiveScreen} />
      </Stack.Navigator>
    </TabErrorBoundary>
  );
}

// Settings Stack Navigator
function SettingsStackNavigator() {
  return (
    <TabErrorBoundary tabName="Settings">
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="DonationHistory" component={DonationHistoryScreen} />
        <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
        <Stack.Screen name="JobCategorySettings" component={JobCategorySettingsScreen} />
        <Stack.Screen name="JobRanking" component={JobRankingScreen} />
      </Stack.Navigator>
    </TabErrorBoundary>
  );
}

// Main Tab Navigator (for authenticated and subscribed users)
function MainTabs() {
  // Subscribe to language changes to re-render tab labels
  const { language } = useLanguage();
  // Get unread counts for badge display
  const { unreadCounts } = useUnread();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.primary, // Titan Black
          borderTopColor: '#222', // Subtle separator
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.signal.active, // Neon Red
        tabBarInactiveTintColor: colors.text.muted, // Dark Grey
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.heading,
          fontSize: 10,
          letterSpacing: 0.5,
          marginTop: 2,
        },
      }}
      screenListeners={({ navigation, route }) => ({
        tabPress: () => {
          const state = navigation.getState();
          const currentRoute = state.routes[state.index];
          if (route.key === currentRoute?.key) {
            // 既にそのタブにいる場合、最初の画面に戻る
            const tabName = route.name;
            const screenMap: Record<string, string> = {
              HomeTab: 'Dashboard',
              MonkModeTab: 'MonkMode',
              LibraryTab: 'Library',
              SettingsTab: 'Settings',
            };
            const screenName = screenMap[tabName];
            if (screenName) {
              navigation.navigate(tabName, { screen: screenName });
            }
          }
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.mission'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "planet" : "planet-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MonkModeTab"
        component={MonkModeStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.focus'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "timer" : "timer-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.archive'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "albums" : "albums-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.system'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "construct" : "construct-outline"} size={size} color={color} />
          ),
          tabBarBadge: unreadCounts.total > 0 ? unreadCounts.total : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.signal.danger,
            fontSize: 10,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
    </Tab.Navigator>
  );
}

// NavigationContent: Contains all auth logic and navigation stacks
// Must be inside NavigationContainer and AnalyticsProvider
function NavigationContent() {
  // Phase 8.3: PostHog Analytics
  const { identify, reset, trackEvent, isReady } = useAnalytics();
  const appLaunchTracked = useRef(false);

  // Phase 8.4: Remote Config - Blocking Status
  const blockingStatus = useBlockingStatus();

  // 統一された認証状態（フリッカー防止のためアトミックに更新）
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  // セーフティタイマー用に最新の状態を追跡（クロージャ問題を回避）
  const authStateRef = useRef<AuthState>({ status: 'loading' });

  // ユーザーステータスを確認する純粋関数
  // isSubscribed と hasCompletedOnboarding の両方を返す
  // 新規ユーザーの場合はプロファイルがまだ存在しない可能性があるため、
  // リトライは1回のみで、素早くデフォルト値を返してアプリに入れるようにする
  interface UserStatus {
    isSubscribed: boolean;
    hasCompletedOnboarding: boolean;
    legalConsentVersion: string | null;
  }

  // キャッシュヘルパー: DB失敗時のフォールバックとしてAsyncStorageにUserStatusを保存
  interface CachedUserStatus extends UserStatus {
    cachedAt: string;
  }

  async function getCachedUserStatus(userId: string): Promise<UserStatus | null> {
    try {
      const cached = await AsyncStorage.getItem(`userStatus_${userId}`);
      if (!cached) return null;
      const parsed: CachedUserStatus = JSON.parse(cached);
      if (__DEV__) console.log(`📊 getCachedUserStatus: Found cache from ${parsed.cachedAt}`);
      return {
        isSubscribed: parsed.isSubscribed,
        hasCompletedOnboarding: parsed.hasCompletedOnboarding,
        legalConsentVersion: parsed.legalConsentVersion,
      };
    } catch {
      return null;
    }
  }

  async function setCachedUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      const cacheData: CachedUserStatus = { ...status, cachedAt: new Date().toISOString() };
      await AsyncStorage.setItem(`userStatus_${userId}`, JSON.stringify(cacheData));
    } catch { /* non-critical */ }
  }

  async function checkUserStatus(userId: string, retryCount = 0): Promise<UserStatus> {
    const maxRetries = 2; // 2回リトライ（合計3回試行）
    const TIMEOUT_MS = 4000; // 4秒のタイムアウト（OAuth後のセッション確立に時間がかかるため）

    // デフォルト: キャッシュなし・DB失敗時は安全側（Onboardingへ）
    const defaultStatus: UserStatus = {
      isSubscribed: false,
      hasCompletedOnboarding: false,
      legalConsentVersion: null,
    };

    // Supabaseが初期化されていない場合は即座にデフォルト値を返す
    if (!isSupabaseInitialized()) {
      if (__DEV__) console.warn('📊 checkUserStatus: Supabase not initialized, returning default');
      return defaultStatus;
    }

    if (__DEV__) console.log(`📊 checkUserStatus: Attempt ${retryCount + 1}/${maxRetries + 1} for user ${userId.slice(0, 8)}...`);

    try {
      // OAuth後にSupabaseクライアントのセッション状態が更新されていない可能性があるため、
      // DBリクエスト前にセッションを明示的に取得/更新する
      await supabase.auth.getSession();

      // DBリクエストのPromise
      const dbRequest = supabase
        .from('users')
        .select('subscription_status, onboarding_completed, legal_consent_version')
        .eq('id', userId)
        .single();

      // タイムアウト時はrejectではなくnullをresolveする（catchブロックに入らないように）
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          if (__DEV__) console.log('📊 checkUserStatus: Request timed out');
          resolve(null);
        }, TIMEOUT_MS)
      );

      // Promise.raceで競合させる
      const result = await Promise.race([dbRequest, timeoutPromise]);

      // タイムアウトした場合（resultがnull）
      if (result === null) {
        if (retryCount < maxRetries) {
          if (__DEV__) console.log(`📊 checkUserStatus: Timeout, waiting 500ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, 500)); // セッション安定化待機
          return checkUserStatus(userId, retryCount + 1);
        }
        // 最大リトライ後もタイムアウト → キャッシュ → デフォルト値
        if (__DEV__) console.log(`📊 checkUserStatus: Max retries reached after timeout, trying cache...`);
        captureError(new Error('checkUserStatus timeout after max retries'), {
          location: 'AppNavigator.checkUserStatus',
          extra: { userId: userId.slice(0, 8) },
        });
        const cached = await getCachedUserStatus(userId);
        if (cached) {
          if (__DEV__) console.log('📊 checkUserStatus: Using cached status (timeout fallback)');
          return cached;
        }
        return defaultStatus;
      }

      const { data, error } = result;

      if (error) {
        if (__DEV__) console.log(`📊 checkUserStatus: Error code=${error.code}, message=${error.message}`);

        // usersテーブルにレコードが見つからない場合（PGRST116）、短めのリトライ
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          if (__DEV__) console.log(`📊 checkUserStatus: User profile not found, retrying in 500ms...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return checkUserStatus(userId, retryCount + 1);
        }

        // プロファイルが見つからない → キャッシュ → デフォルト値
        if (__DEV__) console.log(`📊 checkUserStatus: DB error, trying cache...`);
        const cachedOnError = await getCachedUserStatus(userId);
        if (cachedOnError) {
          if (__DEV__) console.log('📊 checkUserStatus: Using cached status (DB error fallback)');
          return cachedOnError;
        }
        return defaultStatus;
      }

      const status: UserStatus = {
        isSubscribed: data?.subscription_status === 'active',
        hasCompletedOnboarding: data?.onboarding_completed ?? false,
        legalConsentVersion: data?.legal_consent_version ?? null,
      };
      if (__DEV__) console.log(`📊 checkUserStatus: Found profile, subscription_status=${data?.subscription_status}, onboarding_completed=${data?.onboarding_completed}`);
      // DB成功時にキャッシュを更新
      setCachedUserStatus(userId, status);
      return status;
    } catch (err) {
      captureError(err, { location: 'AppNavigator.checkUserStatus' });
      const cachedOnCatch = await getCachedUserStatus(userId);
      if (cachedOnCatch) {
        if (__DEV__) console.log('📊 checkUserStatus: Using cached status (catch fallback)');
        return cachedOnCatch;
      }
      return defaultStatus;
    }
  }

  /**
   * OAuth認証後にユーザーレコードを作成するヘルパー関数
   * OnboardingScreen6で保存したusernameをAsyncStorageから取得し、
   * usersテーブルにレコードを作成する
   * 注意: useEffectの外に定義することでonAuthStateChangeからもアクセス可能
   */
  async function createUserRecordFromOnboardingData(session: Session): Promise<void> {
    // Supabaseが初期化されていない場合はスキップ
    if (!isSupabaseInitialized()) {
      if (__DEV__) console.warn('🔗 createUserRecord: Supabase not initialized, skipping');
      return;
    }

    try {
      const onboardingDataStr = await AsyncStorage.getItem('onboardingData');
      if (!onboardingDataStr) {
        if (__DEV__) console.log('🔗 createUserRecord: No onboarding data found in AsyncStorage');
        return;
      }

      let onboardingData: Record<string, unknown> = {};
      try {
        onboardingData = JSON.parse(onboardingDataStr);
      } catch (parseError) {
        captureError(parseError, { location: 'AppNavigator.createUserRecordFromOnboardingData.JSON.parse' });
        return;
      }
      const pendingUsername = onboardingData?.username;

      if (!pendingUsername || typeof pendingUsername !== 'string') {
        if (__DEV__) console.log('🔗 createUserRecord: No username found in onboarding data');
        return;
      }

      // emailが必須フィールドなので、存在しない場合はスキップ
      if (!session.user.email) {
        if (__DEV__) console.log('🔗 createUserRecord: No email in session, skipping');
        return;
      }

      if (__DEV__) console.log('🔗 createUserRecord: Creating user record with username:', pendingUsername);

      const { error } = await supabase.from('users').upsert(
        {
          id: session.user.id,
          email: session.user.email,
          username: pendingUsername,
          subscription_status: 'inactive',
        },
        { onConflict: 'id' }
      );

      if (error) {
        captureError(error, { location: 'AppNavigator.createUserRecordFromOnboardingData.upsert' });
      } else {
        if (__DEV__) console.log('🔗 createUserRecord: User record created successfully ✅');
      }
    } catch (err) {
      captureError(err, { location: 'AppNavigator.createUserRecordFromOnboardingData' });
    }
  }

  /**
   * Wraps an async operation with a timeout.
   * Returns the result if completed within timeout, otherwise returns fallback.
   */
  async function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    fallback: T,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`⏱️ ${operationName}: Timed out after ${timeoutMs}ms, using fallback`);
        resolve(fallback);
      }, timeoutMs);
    });
    return Promise.race([operation, timeoutPromise]);
  }

  useEffect(() => {
    let isMounted = true;

    // Deep Link Handler: Process OAuth callback URLs
    // Security: Validates state parameter (CSRF), sanitizes error messages
    async function handleDeepLink(url: string | null) {
      // SECURITY: Only log URL in dev (contains access_token in production)
      if (__DEV__) console.log('🔗 Deep Link received:', url);
      if (!url || !url.startsWith('commitapp://')) {
        if (__DEV__) console.log('🔗 Deep Link: Ignored (not commitapp://)');
        return;
      }

      try {
        if (__DEV__) console.log('🔗 Deep Link: Processing OAuth callback...');

        // Parse URL with exception handling
        let urlObj: URL;
        try {
          urlObj = new URL(url);
        } catch (parseError) {
          captureError(parseError, { location: 'AppNavigator.handleDeepLink.URL.parse' });
          return;
        }

        const hashParams = new URLSearchParams(urlObj.hash.slice(1));
        const queryParams = urlObj.searchParams;

        // Check for OAuth error first (HTMLエスケープ)
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        if (errorParam) {
          // Sanitize error message (prevent XSS in Alert)
          const safeMessage = errorDescription
            ? errorDescription.replace(/[<>]/g, '').slice(0, 200)
            : i18n.t('common.error');
          // SECURITY: Only log OAuth errors in dev
          if (__DEV__) console.warn('🔗 Deep Link: OAuth error:', errorParam);
          Alert.alert(i18n.t('common.error'), safeMessage);
          return;
        }

        // CSRF Protection: Validate state parameter
        const state = hashParams.get('state') || queryParams.get('state');
        if (state) {
          const expectedState = await AsyncStorage.getItem('oauth_state');
          if (expectedState && state !== expectedState) {
            // SECURITY: Only log CSRF failures in dev (state contains sensitive info)
            if (__DEV__) console.warn('🔗 Deep Link: CSRF validation failed');
            captureError(new Error('OAuth CSRF validation failed'), {
              location: 'AppNavigator.handleDeepLink.CSRF',
            });
            return;
          }
          // Clear the state after validation
          await AsyncStorage.removeItem('oauth_state');
        }

        // PKCE Flow: Check for code parameter
        const code = queryParams.get('code');
        if (code) {
          // PKCEコードはScreen6のhandleOAuthCallbackで既に処理済み
          // ここで再度exchangeCodeForSessionを呼ぶとコード再利用エラーが発生し、
          // セッション状態が破損してScreen13で"Invalid JWT"エラーが発生する
          // Screen6がセッションを確立した後、onAuthStateChangeが自動的に発火するため、
          // AppNavigatorでの重複処理は不要
          if (__DEV__) console.log('🔗 Deep Link: PKCE code detected, skipping (handled by Screen6)');
          return;
        }

        // Implicit Flow: Check for access_token
        const access_token = hashParams.get('access_token') || queryParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        if (__DEV__) console.log('🔗 Deep Link: Checking Implicit flow tokens...', { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token });

        // Token format validation (basic check)
        const isValidToken = (token: string | null): boolean => {
          if (!token) return false;
          // JWT should have 3 parts separated by dots
          const parts = token.split('.');
          return parts.length === 3 && parts.every(part => part.length > 0);
        };

        if (access_token && refresh_token) {
          if (!isValidToken(access_token)) {
            if (__DEV__) console.warn('🔗 Deep Link: Invalid access_token format');
            captureError(new Error('Invalid access_token format'), {
              location: 'AppNavigator.handleDeepLink.tokenValidation',
            });
            return;
          }

          // Supabaseが初期化されていない場合はスキップ
          if (!isSupabaseInitialized()) {
            if (__DEV__) console.warn('🔗 Deep Link: Supabase not initialized, cannot set session');
            return;
          }

          if (__DEV__) console.log('🔗 Deep Link: Found Implicit flow tokens, setting session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            captureError(sessionError, { location: 'AppNavigator.handleDeepLink.setSession' });
            return;
          }
          if (sessionData.session) {
            if (__DEV__) console.log('🔗 Deep Link: Session established via Implicit flow ✅', sessionData.session.user.id);
            // User record creation moved to onAuthStateChange (prevents race condition)
          } else {
            if (__DEV__) console.log('🔗 Deep Link: setSession returned no session');
          }
        } else {
          if (__DEV__) console.log('🔗 Deep Link: No valid tokens found in URL');
        }
      } catch (error) {
        captureError(error, { location: 'AppNavigator.handleDeepLink' });
      }
    }

    // Check for initial URL (cold start)
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for URL events (app already open)
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // 初期化：セッションとサブスク状態を一括で確認・設定
    async function initializeAuth() {
      if (__DEV__) console.log('🚀 initializeAuth: Starting...');

      // ENV_INIT_ERROR: env.ts の初期化が失敗した場合、Supabase接続不可
      if (ENV_INIT_ERROR) {
        console.error('🚀 initializeAuth: ENV_INIT_ERROR detected:', ENV_INIT_ERROR);
        captureError(new Error(`ENV_INIT_ERROR: ${ENV_INIT_ERROR}`), { location: 'AppNavigator.initializeAuth' });
        if (isMounted) setAuthState({ status: 'unauthenticated' });
        return;
      }

      // supabase client が初期化に失敗した場合（env varsが空でcreateClientがスキップされた）
      if (!isSupabaseInitialized()) {
        console.error('🚀 initializeAuth: Supabase client not initialized (credentials missing)');
        captureError(new Error('Supabase client not initialized'), { location: 'AppNavigator.initializeAuth' });
        if (isMounted) setAuthState({ status: 'unauthenticated' });
        return;
      }

      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          { data: { session: null }, error: null },
          'initializeAuth.getSession'
        );
        if (__DEV__) console.log('🚀 initializeAuth: Got session:', session?.user?.id ?? '(no session)');

        if (!session) {
          if (__DEV__) console.log('🚀 initializeAuth: No session, setting unauthenticated');
          if (isMounted) setAuthState({ status: 'unauthenticated' });
          return;
        }

        // ユーザーステータスチェック with outer timeout (8s safety net)
        // タイムアウト時はキャッシュをフォールバックに使用
        if (__DEV__) console.log('🚀 initializeAuth: Checking user status...');
        const cachedFallback = await getCachedUserStatus(session.user.id);
        const userStatus = await withTimeout(
          checkUserStatus(session.user.id),
          8000,
          cachedFallback ?? { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null },
          'initializeAuth.checkUserStatus'
        );
        if (__DEV__) console.log('🚀 initializeAuth: User status:', userStatus);

        if (isMounted) {
          if (__DEV__) console.log('🚀 initializeAuth: Setting authenticated state');
          setAuthState({
            status: 'authenticated',
            session,
            isSubscribed: userStatus.isSubscribed,
            hasCompletedOnboarding: userStatus.hasCompletedOnboarding,
            legalConsentVersion: userStatus.legalConsentVersion,
          });
        }
      } catch (error) {
        captureError(error, { location: 'AppNavigator.initializeAuth' });
        // Fail-safe: Set unauthenticated on error
        if (isMounted) setAuthState({ status: 'unauthenticated' });
      }
    }

    initializeAuth();

    // 認証状態の変化を監視
    // NOTE: supabase が null の場合（環境変数未設定）はスキップ
    let authSubscription: { unsubscribe: () => void } | null = null;

    if (!isSupabaseInitialized()) {
      if (__DEV__) console.warn('⚠️ Auth: Skipping onAuthStateChange (Supabase not initialized)');
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) console.log('✅ Auth State Changed:', event, session?.user?.id ?? '(no session)');

      // INITIAL_SESSION は initializeAuth で処理済み
      if (event === 'INITIAL_SESSION') {
        if (__DEV__) console.log('✅ Auth: Skipping INITIAL_SESSION (handled by initializeAuth)');
        return;
      }

      if (!session) {
        if (isMounted) setAuthState({ status: 'unauthenticated' });
        return;
      }

      // TOKEN_REFRESHED: セッションのみ更新し、既存のisSubscribed/hasCompletedOnboarding状態を維持
      // これにより、Screen13でrefreshSession()を呼んでもスタックが切り替わらない
      // 追加: バックグラウンドで非同期にステータス確認（subscription変更検知）
      if (event === 'TOKEN_REFRESHED') {
        if (__DEV__) console.log('✅ Auth: TOKEN_REFRESHED - preserving current state, checking status in background');
        if (isMounted) {
          setAuthState(prev => {
            if (prev.status !== 'authenticated') {
              // 認証状態でなかった場合は現状維持（通常はここに来ない）
              return prev;
            }
            // セッションのみ更新、isSubscribed/hasCompletedOnboardingは維持
            return { ...prev, session };
          });

          // 非ブロッキングでステータス確認（Web Portalでのサブスク変更を検知）
          // Note: await不要 - バックグラウンドで実行し、結果が来たら状態更新
          checkUserStatus(session.user.id).then(updatedStatus => {
            if (!isMounted) return;
            setAuthState(prev => {
              if (prev.status !== 'authenticated') return prev;
              // キャッシュも更新
              setCachedUserStatus(session.user.id, updatedStatus);
              return { ...prev, ...updatedStatus };
            });
          }).catch(err => {
            // 非ブロッキングなのでエラーはログのみ
            if (__DEV__) console.warn('✅ Auth: TOKEN_REFRESHED status check failed:', err);
          });
        }
        return;
      }

      // ローディング状態に入る
      if (isMounted) setAuthState({ status: 'loading' });

      // フェイルセーフのためのデフォルト値
      let userStatus: UserStatus = { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null };

      // Auth画面からのログインかどうかを判定
      const loginSource = await AsyncStorage.getItem('loginSource');
      const isFromAuthScreen = loginSource === 'auth_screen';
      if (isFromAuthScreen) {
        if (__DEV__) console.log('✅ Auth: Detected login from Auth screen (existing user re-login)');
        await AsyncStorage.removeItem('loginSource');
      }

      try {
        // SIGNED_IN: ユーザーレコード作成（5秒タイムアウト）
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (__DEV__) console.log('✅ Auth: Processing SIGNED_IN/USER_UPDATED...');

          // 認証トリガーを待つ
          await new Promise(resolve => setTimeout(resolve, 300));

          // ユーザーレコード作成（タイムアウトあり、失敗しても続行）
          await withTimeout(
            createUserRecordFromOnboardingData(session),
            5000,
            undefined,
            'createUserRecord'
          );
        }

        // ユーザーステータスチェック（15秒の外部タイムアウト）
        // タイムアウト時はキャッシュをフォールバックに使用
        if (__DEV__) console.log('✅ Auth: Checking user status...');
        const authCachedFallback = await getCachedUserStatus(session.user.id);
        userStatus = await withTimeout(
          checkUserStatus(session.user.id),
          15000,
          authCachedFallback ?? { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null },
          'checkUserStatus'
        );
        if (__DEV__) console.log('✅ Auth: User status check complete:', userStatus);

      } catch (error) {
        captureError(error, { location: 'AppNavigator.onAuthStateChange' });
        // デフォルト値で続行
      } finally {
        // 保証: 必ずローディング状態を終了（条件分岐なし）
        if (isMounted) {
          if (__DEV__) console.log('✅ Auth: Setting authenticated state (finally block)');
          setAuthState({
            status: 'authenticated',
            session,
            isSubscribed: userStatus.isSubscribed,
            hasCompletedOnboarding: userStatus.hasCompletedOnboarding,
            legalConsentVersion: userStatus.legalConsentVersion,
          });
        }
      }
    });
      authSubscription = subscription;
    }

    // usersテーブルのsubscription_status/onboarding_completedの変更を監視
    let realtimeSubscription: RealtimeChannel | null = null;

    async function setupRealtimeSubscription() {
      // 二重チェック: 呼び出し元でもチェックしているが、念のため
      if (!isSupabaseInitialized()) {
        if (__DEV__) console.warn('⚠️ setupRealtimeSubscription: Supabase not initialized');
        return;
      }

      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        { data: { session: null }, error: null },
        'setupRealtimeSubscription.getSession'
      );
      if (session?.user?.id) {
        realtimeSubscription = supabase
          .channel('user-status-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${session.user.id}`,
            },
            (payload) => {
              const newSubscriptionStatus = payload.new.subscription_status === 'active';
              const newOnboardingCompleted = payload.new.onboarding_completed ?? false;
              const newLegalConsentVersion = payload.new.legal_consent_version ?? null;

              const newStatus: UserStatus = {
                isSubscribed: newSubscriptionStatus,
                hasCompletedOnboarding: newOnboardingCompleted,
                legalConsentVersion: newLegalConsentVersion,
              };

              // キャッシュも更新
              setCachedUserStatus(session.user.id, newStatus);

              // 既存の認証状態を維持しつつユーザーステータスを更新
              setAuthState(prev => {
                if (prev.status !== 'authenticated') return prev;
                return { ...prev, ...newStatus };
              });
            }
          )
          .subscribe();
      }
    }

    // Supabaseが初期化されている場合のみRealtimeを設定
    if (isSupabaseInitialized()) {
      setupRealtimeSubscription();
    }

    // Listen for manual auth refresh events (from OnboardingScreen13 after subscription update)
    const refreshListener = DeviceEventEmitter.addListener(AUTH_REFRESH_EVENT, async () => {
      // Supabaseが初期化されていない場合はスキップ
      if (!isSupabaseInitialized()) {
        if (__DEV__) console.warn('⚠️ Auth Refresh: Skipping (Supabase not initialized)');
        return;
      }

      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        { data: { session: null }, error: null },
        'refreshListener.getSession'
      );
      if (session && isMounted) {
        const refreshCachedFallback = await getCachedUserStatus(session.user.id);
        const userStatus = await withTimeout(
          checkUserStatus(session.user.id),
          15000,
          refreshCachedFallback ?? { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null },
          'refreshListener.checkUserStatus'
        );

        setAuthState({
          status: 'authenticated',
          session,
          isSubscribed: userStatus.isSubscribed,
          hasCompletedOnboarding: userStatus.hasCompletedOnboarding,
          legalConsentVersion: userStatus.legalConsentVersion,
        });
      }
    });

    return () => {
      isMounted = false;
      linkingSubscription.remove();
      authSubscription?.unsubscribe();
      refreshListener.remove();
      if (realtimeSubscription) {
        try {
          realtimeSubscription.unsubscribe();
        } catch (unsubError) {
          // Non-critical error, log only in development
          if (__DEV__) console.error('Failed to unsubscribe from realtime channel:', unsubError);
        }
      }
    };
  }, []);

  // authStateが変わるたびにrefを更新（セーフティタイマー用）
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Hide splash screen once auth state is resolved
  useEffect(() => {
    if (authState.status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [authState.status]);

  // Safety: force hide splash after 15s even if auth never resolves
  // Increased from 8s to 15s to accommodate OAuth + user record creation + subscription check
  // OAuth後のセッション確立 + ユーザーレコード作成（5s）+ ステータスチェック（8s）に対応
  // NOTE: authStateRef.current を使用して最新の状態を参照（クロージャ問題を回避）
  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (!isMounted) return; // Component unmounted, skip
      SplashScreen.hideAsync();
      // authStateRef.current で最新の値を参照（依存配列が空でも正確な値を取得）
      if (authStateRef.current.status === 'loading') {
        console.warn('[AppNavigator] Safety timer: forcing unauthenticated after 15s');
        setAuthState({ status: 'unauthenticated' });
      }
    }, 15000);
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // 統一状態から値を取得
  const isLoading = authState.status === 'loading';
  const session = authState.status === 'authenticated' ? authState.session : null;
  const isSubscribed = authState.status === 'authenticated' ? authState.isSubscribed : false;
  const hasCompletedOnboarding = authState.status === 'authenticated' ? authState.hasCompletedOnboarding : false;
  const legalConsentVersion = authState.status === 'authenticated' ? authState.legalConsentVersion : null;
  const showLegalConsentScreen = authState.status === 'authenticated' && hasCompletedOnboarding && needsLegalConsent(legalConsentVersion);

  // Phase 8.1: Set Sentry user context for crash monitoring
  // Phase 8.3: Set PostHog user identification
  useEffect(() => {
    if (authState.status === 'authenticated') {
      setUserContext(authState.session.user.id);
      // PostHog: Identify user (no PII - userId only)
      identify(authState.session.user.id, {
        subscription_status: authState.isSubscribed ? 'active' : 'inactive',
      });
    } else if (authState.status === 'unauthenticated') {
      clearUserContext();
      reset(); // Clear PostHog identity
    }
  }, [authState, identify, reset]);

  // Phase 8.3: Track app launch once per session
  useEffect(() => {
    if (authState.status !== 'loading' && isReady && !appLaunchTracked.current) {
      appLaunchTracked.current = true;
      trackEvent('app_launched', {
        auth_status: authState.status,
        is_subscribed: authState.status === 'authenticated' ? authState.isSubscribed : null,
      });
    }
  }, [authState.status, isReady, trackEvent]);

  // Phase 7.3: Register push token when user is authenticated and subscribed
  const pushTokenRegistered = useRef(false);
  useEffect(() => {
    async function registerPushToken() {
      if (authState.status === 'authenticated' && authState.isSubscribed && !pushTokenRegistered.current) {
        pushTokenRegistered.current = true;

        // Initialize notification service and register push token
        await NotificationService.initialize();
        const success = await NotificationService.registerForPushNotifications();

        if (success) {
        } else {
          // Reset flag to allow retry on next auth state change
          pushTokenRegistered.current = false;
        }
      }

      // Reset flag when user logs out
      if (authState.status === 'unauthenticated') {
        pushTokenRegistered.current = false;
      }
    }

    registerPushToken();
  }, [authState]);

  // Phase 8.4: Blocking Screen (highest priority - before loading/auth)
  if (blockingStatus.isBlocked) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {blockingStatus.reason === 'maintenance' ? (
          <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
        ) : (
          <Stack.Screen
            name="ForceUpdate"
            component={ForceUpdateScreen}
            initialParams={{ storeUrl: blockingStatus.storeUrl }}
          />
        )}
      </Stack.Navigator>
    );
  }

  // ローディング中はローディング画面を表示
  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.signal.active} />
        <View style={loadingStyles.textContainer}>
          <Text style={loadingStyles.title}>COMMIT</Text>
          <Text style={loadingStyles.subtitle}>SYSTEM INITIALIZING...</Text>
        </View>
      </View>
    );
  }

  // 法的同意が必要な場合（オンボーディング完了済みユーザーのみ）
  // LegalConsentScreenはStack.Navigatorの外で表示（フルスクリーンモーダル）
  if (showLegalConsentScreen && session) {
    const handleLegalConsentComplete = () => {
      // Realtime subscription will update the state automatically
      // Just force a refresh to ensure immediate UI update
      setAuthState(prev => {
        if (prev.status !== 'authenticated') return prev;
        return {
          ...prev,
          legalConsentVersion: CURRENT_LEGAL_VERSION,
        };
      });
    };

    return (
      <LegalConsentScreen
        userId={session.user.id}
        onConsentComplete={handleLegalConsentComplete}
      />
    );
  }

  // Onboarding stacks: wrap with OnboardingAtmosphereProvider for ambient audio
  if (!session) {
    return (
      <OnboardingAtmosphereProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding0" component={OnboardingScreen0} options={{ gestureEnabled: false }} />
          <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
          <Stack.Screen name="OnboardingJobCategory" component={OnboardingJobCategory} />
          <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
          <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
          <Stack.Screen name="ManualBookEntry" component={ManualBookEntryScreen} />
          <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
          <Stack.Screen name="Onboarding5" component={OnboardingScreen5} />
          <Stack.Screen name="Onboarding6" component={OnboardingScreen6} />
          <Stack.Screen name="Onboarding7" component={OnboardingScreen7} />
          <Stack.Screen name="Onboarding8" component={OnboardingScreen8} />
          <Stack.Screen name="Onboarding9" component={OnboardingScreen9} />
          <Stack.Screen name="Onboarding10" component={OnboardingScreen10} />
          <Stack.Screen name="Onboarding11" component={OnboardingScreen11} />
          <Stack.Screen name="Onboarding12" component={OnboardingScreen12} />
          <Stack.Screen name="Onboarding13" component={OnboardingScreen13} />
          <Stack.Screen name="WarpTransition" component={WarpTransitionScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      </OnboardingAtmosphereProvider>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingAtmosphereProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding7" component={OnboardingScreen7} options={{ gestureEnabled: false }} />
          <Stack.Screen name="Onboarding8" component={OnboardingScreen8} />
          <Stack.Screen name="Onboarding9" component={OnboardingScreen9} />
          <Stack.Screen name="Onboarding10" component={OnboardingScreen10} />
          <Stack.Screen name="Onboarding11" component={OnboardingScreen11} />
          <Stack.Screen name="Onboarding12" component={OnboardingScreen12} />
          <Stack.Screen name="Onboarding13" component={OnboardingScreen13} />
          <Stack.Screen name="WarpTransition" component={WarpTransitionScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      </OnboardingAtmosphereProvider>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

// Helper to extract current route name from navigation state
function getActiveRouteName(state: any): string | null {
  if (!state?.routes?.length) return null;
  const route = state.routes[state.index];
  // Handle nested navigators (e.g., HomeTab/Dashboard)
  if (route.state?.routes?.length) {
    const nestedRoute = route.state.routes[route.state.index];
    return `${route.name}/${nestedRoute.name}`;
  }
  return route.name;
}

// AppNavigatorInner: Provides NavigationContainer with AnalyticsProvider inside
function AppNavigatorInner() {
  // Subscribe to language changes to force re-render of entire navigation tree
  const { language } = useLanguage();
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string | null>(null);

  const navigationContent = (
    <NavigationContainer
      ref={navigationRef}
      key={language}
      onReady={() => {
        // Set initial route name
        routeNameRef.current = getActiveRouteName(navigationRef.getRootState());
      }}
      onStateChange={() => {
        const currentRouteName = getActiveRouteName(navigationRef.getRootState());
        // Only track if route actually changed
        if (currentRouteName && currentRouteName !== routeNameRef.current) {
          trackScreenView(currentRouteName);
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <AnalyticsProvider>
        <UnreadProvider>
          <NavigationContent />
        </UnreadProvider>
      </AnalyticsProvider>
    </NavigationContainer>
  );

  // Skip StripeProvider if env vars are missing/invalid to prevent native crash
  if (ENV_INIT_ERROR || !STRIPE_PUBLISHABLE_KEY) {
    return (
      <>
        {navigationContent}
        <OfflineBanner />
      </>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      {navigationContent}
      <OfflineBanner />
    </StripeProvider>
  );
}

// Wrap with LanguageProvider and OfflineProvider
// Note: AnalyticsProvider is now inside NavigationContainer (in AppNavigatorInner)
// to ensure PostHog's captureScreens has access to navigation context
export default function AppNavigator() {
  return (
    <LanguageProvider>
      <OfflineProvider>
        <AppNavigatorInner />
      </OfflineProvider>
    </LanguageProvider>
  );
}

// ローディング画面のスタイル
const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
    letterSpacing: 2,
    marginTop: 8,
  },
});