// URL Polyfill moved to index.js (must be first import in app entry point)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, DeviceEventEmitter, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, AUTH_REFRESH_EVENT } from '../lib/supabase';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '../config/env';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { AnalyticsProvider, useAnalytics } from '../contexts/AnalyticsContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { UnreadProvider, useUnread } from '../contexts/UnreadContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors, typography } from '../theme';
import { NotificationService } from '../lib/NotificationService';
import i18n from '../i18n';
import { setUserContext, clearUserContext } from '../utils/errorLogger';
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

  // ユーザーステータスを確認する純粋関数
  // isSubscribed と hasCompletedOnboarding の両方を返す
  // 新規ユーザーの場合はプロファイルがまだ存在しない可能性があるため、
  // リトライは1回のみで、素早くデフォルト値を返してアプリに入れるようにする
  interface UserStatus {
    isSubscribed: boolean;
    hasCompletedOnboarding: boolean;
    legalConsentVersion: string | null;
  }

  async function checkUserStatus(userId: string, retryCount = 0): Promise<UserStatus> {
    const maxRetries = 2; // 2回リトライ（合計3回試行）
    const TIMEOUT_MS = 4000; // 4秒のタイムアウト（OAuth後のセッション確立に時間がかかるため）
    const defaultStatus: UserStatus = { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null };

    console.log(`📊 checkUserStatus: Attempt ${retryCount + 1}/${maxRetries + 1} for user ${userId.slice(0, 8)}...`);

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
          console.log('📊 checkUserStatus: Request timed out');
          resolve(null);
        }, TIMEOUT_MS)
      );

      // Promise.raceで競合させる
      const result = await Promise.race([dbRequest, timeoutPromise]);

      // タイムアウトした場合（resultがnull）
      if (result === null) {
        if (retryCount < maxRetries) {
          console.log(`📊 checkUserStatus: Timeout, waiting 500ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, 500)); // セッション安定化待機
          return checkUserStatus(userId, retryCount + 1);
        }
        // 最大リトライ後もタイムアウト → デフォルト値を返す（新規ユーザー扱い）
        console.log('📊 checkUserStatus: Max retries reached after timeout');
        return defaultStatus;
      }

      const { data, error } = result;

      if (error) {
        console.log(`📊 checkUserStatus: Error code=${error.code}, message=${error.message}`);

        // usersテーブルにレコードが見つからない場合（PGRST116）、短めのリトライ
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`📊 checkUserStatus: User profile not found, retrying in 500ms...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return checkUserStatus(userId, retryCount + 1);
        }

        // プロファイルが見つからない = 新規ユーザー = オンボーディング未完了
        console.log(`📊 checkUserStatus: Returning default (no profile or error)`);
        return defaultStatus;
      }

      const status: UserStatus = {
        isSubscribed: data?.subscription_status === 'active',
        hasCompletedOnboarding: data?.onboarding_completed ?? false,
        legalConsentVersion: data?.legal_consent_version ?? null,
      };
      console.log(`📊 checkUserStatus: Found profile, subscription_status=${data?.subscription_status}, onboarding_completed=${data?.onboarding_completed}, legal_consent_version=${data?.legal_consent_version}`);
      return status;
    } catch (err) {
      console.error('📊 checkUserStatus: Unexpected error:', err);
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
    try {
      const onboardingDataStr = await AsyncStorage.getItem('onboardingData');
      if (!onboardingDataStr) {
        console.log('🔗 createUserRecord: No onboarding data found in AsyncStorage');
        return;
      }

      const onboardingData = JSON.parse(onboardingDataStr);
      const pendingUsername = onboardingData?.username;

      if (!pendingUsername) {
        console.log('🔗 createUserRecord: No username found in onboarding data');
        return;
      }

      // emailが必須フィールドなので、存在しない場合はスキップ
      if (!session.user.email) {
        console.log('🔗 createUserRecord: No email in session, skipping');
        return;
      }

      console.log('🔗 createUserRecord: Creating user record with username:', pendingUsername);

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
        console.error('🔗 createUserRecord: Failed to create user record:', error.message);
      } else {
        console.log('🔗 createUserRecord: User record created successfully ✅');
      }
    } catch (err) {
      console.error('🔗 createUserRecord: Unexpected error:', err);
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
    async function handleDeepLink(url: string | null) {
      console.log('🔗 Deep Link received:', url);
      if (!url || !url.startsWith('commitapp://')) {
        console.log('🔗 Deep Link: Ignored (not commitapp://)');
        return;
      }

      try {
        console.log('🔗 Deep Link: Processing OAuth callback...');
        const urlObj = new URL(url);
        const hashParams = new URLSearchParams(urlObj.hash.slice(1));
        const queryParams = urlObj.searchParams;

        // PKCE Flow: Check for code parameter
        const code = queryParams.get('code');
        if (code) {
          // PKCEコードはScreen6のhandleOAuthCallbackで既に処理済み
          // ここで再度exchangeCodeForSessionを呼ぶとコード再利用エラーが発生し、
          // セッション状態が破損してScreen13で"Invalid JWT"エラーが発生する
          // Screen6がセッションを確立した後、onAuthStateChangeが自動的に発火するため、
          // AppNavigatorでの重複処理は不要
          console.log('🔗 Deep Link: PKCE code detected, skipping (handled by Screen6)');
          return;
        }

        // Implicit Flow: Check for access_token
        const access_token = hashParams.get('access_token') || queryParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        console.log('🔗 Deep Link: Checking Implicit flow tokens...', { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token });
        if (access_token && refresh_token) {
          console.log('🔗 Deep Link: Found Implicit flow tokens, setting session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            console.error('🔗 Deep Link: setSession FAILED:', sessionError.message);
            return;
          }
          if (sessionData.session) {
            console.log('🔗 Deep Link: Session established via Implicit flow ✅', sessionData.session.user.id);
            // User record creation moved to onAuthStateChange (prevents race condition)
          } else {
            console.log('🔗 Deep Link: setSession returned no session');
          }
        } else {
          console.log('🔗 Deep Link: No valid tokens found in URL');
        }
      } catch (error) {
        console.error('🔗 Deep Link processing ERROR:', error);
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
      console.log('🚀 initializeAuth: Starting...');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🚀 initializeAuth: Got session:', session?.user?.id ?? '(no session)');

        if (!session) {
          console.log('🚀 initializeAuth: No session, setting unauthenticated');
          if (isMounted) setAuthState({ status: 'unauthenticated' });
          return;
        }

        // ユーザーステータスチェック with outer timeout (8s safety net)
        console.log('🚀 initializeAuth: Checking user status...');
        const userStatus = await withTimeout(
          checkUserStatus(session.user.id),
          8000,
          { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null },
          'initializeAuth.checkUserStatus'
        );
        console.log('🚀 initializeAuth: User status:', userStatus);

        if (isMounted) {
          console.log('🚀 initializeAuth: Setting authenticated state');
          setAuthState({
            status: 'authenticated',
            session,
            isSubscribed: userStatus.isSubscribed,
            hasCompletedOnboarding: userStatus.hasCompletedOnboarding,
            legalConsentVersion: userStatus.legalConsentVersion,
          });
        }
      } catch (error) {
        console.error('🚀 initializeAuth: ERROR:', error);
        // Fail-safe: Set unauthenticated on error
        if (isMounted) setAuthState({ status: 'unauthenticated' });
      }
    }

    initializeAuth();

    // 認証状態の変化を監視
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('✅ Auth State Changed:', event, session?.user?.id ?? '(no session)');

      // INITIAL_SESSION は initializeAuth で処理済み
      if (event === 'INITIAL_SESSION') {
        console.log('✅ Auth: Skipping INITIAL_SESSION (handled by initializeAuth)');
        return;
      }

      if (!session) {
        if (isMounted) setAuthState({ status: 'unauthenticated' });
        return;
      }

      // TOKEN_REFRESHED: セッションのみ更新し、既存のisSubscribed/hasCompletedOnboarding状態を維持
      // これにより、Screen13でrefreshSession()を呼んでもスタックが切り替わらない
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Auth: TOKEN_REFRESHED - preserving current state');
        if (isMounted) {
          setAuthState(prev => {
            if (prev.status !== 'authenticated') {
              // 認証状態でなかった場合は現状維持（通常はここに来ない）
              return prev;
            }
            // セッションのみ更新、isSubscribed/hasCompletedOnboardingは維持
            return { ...prev, session };
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
        console.log('✅ Auth: Detected login from Auth screen (existing user re-login)');
        await AsyncStorage.removeItem('loginSource');
      }

      // ユーザーステータスチェック用のPromise（バックグラウンド継続用）
      let statusPromise: Promise<UserStatus> | null = null;

      try {
        // SIGNED_IN: ユーザーレコード作成（5秒タイムアウト）
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          console.log('✅ Auth: Processing SIGNED_IN/USER_UPDATED...');

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
        // 内側のcheckUserStatusが最大13秒かかる可能性があるため余裕を持たせる
        console.log('✅ Auth: Checking user status...');
        statusPromise = checkUserStatus(session.user.id);
        userStatus = await withTimeout(
          statusPromise,
          15000,
          { isSubscribed: false, hasCompletedOnboarding: false, legalConsentVersion: null },
          'checkUserStatus'
        );
        console.log('✅ Auth: User status check complete:', userStatus);

        // Auth画面からのログインでタイムアウトした場合、バックグラウンドで結果を待つ
        // ローディング状態を維持し、結果が来てから状態を設定（Onboarding7のチラつき防止）
        if (!userStatus.hasCompletedOnboarding && isFromAuthScreen && statusPromise) {
          console.log('✅ Auth: Waiting for background user status check (Auth screen login)...');
          statusPromise.then((result) => {
            console.log('✅ Auth: Background check complete, result:', result);
            if (isMounted) {
              try {
                // バックグラウンドチェック完了後に状態を設定
                setAuthState({
                  status: 'authenticated',
                  session,
                  isSubscribed: result.isSubscribed,
                  hasCompletedOnboarding: result.hasCompletedOnboarding,
                  legalConsentVersion: result.legalConsentVersion,
                });
              } catch (stateError) {
                console.error('✅ Auth: Failed to set auth state in background callback:', stateError);
              }
            }
          }).catch((err) => {
            console.error('✅ Auth: Background check error:', err);
            // エラー時はデフォルト値で状態を設定
            if (isMounted) {
              try {
                setAuthState({
                  status: 'authenticated',
                  session,
                  isSubscribed: false,
                  hasCompletedOnboarding: false,
                  legalConsentVersion: null,
                });
              } catch (stateError) {
                console.error('✅ Auth: Failed to set fallback auth state:', stateError);
              }
            }
          });
        }

      } catch (error) {
        console.error('❌ Auth State Change Error:', error);
        // デフォルト値で続行
      } finally {
        // 保証: 必ずローディング状態を終了
        // ただし、Auth画面からのログインでタイムアウトした場合は、
        // バックグラウンドチェックの結果を待つ（ローディング状態維持）
        if (isMounted) {
          if (isFromAuthScreen && !userStatus.hasCompletedOnboarding && statusPromise) {
            console.log('✅ Auth: Waiting for background check (Auth screen login), keeping loading state...');
            // finally blockでは状態を設定しない
            // バックグラウンドチェックの.then()で状態を設定する
          } else {
            console.log('✅ Auth: Setting authenticated state (finally block)');
            setAuthState({
              status: 'authenticated',
              session,
              isSubscribed: userStatus.isSubscribed,
              hasCompletedOnboarding: userStatus.hasCompletedOnboarding,
              legalConsentVersion: userStatus.legalConsentVersion,
            });
          }
        }
      }
    });

    // usersテーブルのsubscription_status/onboarding_completedの変更を監視
    let realtimeSubscription: RealtimeChannel | null = null;

    async function setupRealtimeSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
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

              // 既存の認証状態を維持しつつユーザーステータスを更新
              setAuthState(prev => {
                if (prev.status !== 'authenticated') return prev;
                return {
                  ...prev,
                  isSubscribed: newSubscriptionStatus,
                  hasCompletedOnboarding: newOnboardingCompleted,
                  legalConsentVersion: newLegalConsentVersion,
                };
              });
            }
          )
          .subscribe();
      }
    }

    setupRealtimeSubscription();

    // Listen for manual auth refresh events (from OnboardingScreen13 after subscription update)
    const refreshListener = DeviceEventEmitter.addListener(AUTH_REFRESH_EVENT, async () => {

      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        const userStatus = await checkUserStatus(session.user.id);

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
      authSubscription.unsubscribe();
      refreshListener.remove();
      if (realtimeSubscription) {
        try {
          realtimeSubscription.unsubscribe();
        } catch (unsubError) {
          console.error('Failed to unsubscribe from realtime channel:', unsubError);
        }
      }
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

  // ローディング中はブランドローディング画面を表示
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <>
          {/* Onboarding flow screens (14 screens total) */}
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

          {/* Legacy auth screen (for existing users or testing) */}

          {/* Legacy auth screen (for existing users or testing) */}
          <Stack.Screen name="Auth" component={AuthScreen} />
        </>
      ) : !hasCompletedOnboarding ? (
        <>
          {/* Authenticated but onboarding not completed - show Onboarding7-13 + MainTabs for transition */}
          <Stack.Screen name="Onboarding7" component={OnboardingScreen7} options={{ gestureEnabled: false }} />
          <Stack.Screen name="Onboarding8" component={OnboardingScreen8} />
          <Stack.Screen name="Onboarding9" component={OnboardingScreen9} />
          <Stack.Screen name="Onboarding10" component={OnboardingScreen10} />
          <Stack.Screen name="Onboarding11" component={OnboardingScreen11} />
          <Stack.Screen name="Onboarding12" component={OnboardingScreen12} />
          <Stack.Screen name="Onboarding13" component={OnboardingScreen13} />
          <Stack.Screen name="WarpTransition" component={WarpTransitionScreen} />

          {/* Main tabs for direct navigation after subscription */}
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </>
      ) : (
        <>
          {/* Authenticated and onboarding completed - show MainTabs (regardless of subscription status) */}
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </>
      )}
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

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
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
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.microCaps,
    color: colors.text.secondary,
    marginTop: 8,
    letterSpacing: 2,
  },
  spinner: {
    marginTop: 32,
  },
});