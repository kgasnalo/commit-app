import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, DeviceEventEmitter, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, AUTH_REFRESH_EVENT } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StripeProvider } from '@stripe/stripe-react-native';
import i18n from '../i18n';
import { STRIPE_PUBLISHABLE_KEY } from '../config/env';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { AnalyticsProvider, useAnalytics } from '../contexts/AnalyticsContext';
import { OfflineProvider } from '../contexts/OfflineContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { colors, typography } from '../theme';
import { NotificationService } from '../lib/NotificationService';
import { setUserContext, clearUserContext } from '../utils/errorLogger';

// 統一された認証状態型
type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: Session; isSubscribed: boolean };

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
import LibraryScreen from '../screens/LibraryScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import MonkModeScreen from '../screens/monkmode/MonkModeScreen';
import MonkModeActiveScreen from '../screens/monkmode/MonkModeActiveScreen';

// Onboarding screens
import OnboardingScreen0 from '../screens/onboarding/OnboardingScreen0_Welcome';
import OnboardingScreen1 from '../screens/onboarding/OnboardingScreen1_TsundokuCount';
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="CreateCommitment" component={CreateCommitmentScreen} />
      <Stack.Screen name="CommitmentDetail" component={CommitmentDetailScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
    </Stack.Navigator>
  );
}

// Library Stack Navigator
function LibraryStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
    </Stack.Navigator>
  );
}

// Monk Mode Stack Navigator
function MonkModeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MonkMode" component={MonkModeScreen} />
      <Stack.Screen name="MonkModeActive" component={MonkModeActiveScreen} />
    </Stack.Navigator>
  );
}

// Settings Stack Navigator
function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator (for authenticated and subscribed users)
function MainTabs() {
  // Subscribe to language changes to re-render tab labels
  const { language } = useLanguage();

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
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'MISSION',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "planet" : "planet-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MonkModeTab"
        component={MonkModeStackNavigator}
        options={{
          tabBarLabel: 'FOCUS',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "timer" : "timer-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
        options={{
          tabBarLabel: 'ARCHIVE',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "albums" : "albums-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: 'SYSTEM',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "construct" : "construct-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigatorInner() {
  // Subscribe to language changes to force re-render of entire navigation tree
  const { language } = useLanguage();

  // Phase 8.3: PostHog Analytics
  const { identify, reset, trackEvent, isReady } = useAnalytics();
  const appLaunchTracked = useRef(false);

  // Phase 8.4: Remote Config - Blocking Status
  const blockingStatus = useBlockingStatus();

  // 統一された認証状態（フリッカー防止のためアトミックに更新）
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  // サブスクリプション状態を確認する純粋関数（boolean を返す）
  async function checkSubscriptionStatus(userId: string, retryCount = 0): Promise<boolean> {
    const maxRetries = 3;
    try {

      const { data, error } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Subscription check error:', error);

        // usersテーブルにレコードが見つからない場合、リトライ
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return checkSubscriptionStatus(userId, retryCount + 1);
        }

        return false;
      }

      const isActive = data?.subscription_status === 'active';
      return isActive;
    } catch (err) {
      console.error('Unexpected error checking subscription:', err);
      return false;
    }
  }

  useEffect(() => {
    let isMounted = true;

    // 初期化：セッションとサブスク状態を一括で確認・設定
    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) setAuthState({ status: 'unauthenticated' });
          return;
        }

        // サブスクリプションチェック完了後に状態を一括更新
        const isSubscribed = await checkSubscriptionStatus(session.user.id);

        if (isMounted) {
          setAuthState({
            status: 'authenticated',
            session,
            isSubscribed,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) setAuthState({ status: 'unauthenticated' });
      }
    }

    initializeAuth();

    // 認証状態の変化を監視
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

      // INITIAL_SESSION は initializeAuth で処理済み
      if (event === 'INITIAL_SESSION') return;

      if (!session) {
        if (isMounted) setAuthState({ status: 'unauthenticated' });
        return;
      }

      // 重要: 先にローディング状態にしてフリッカーを防止
      if (isMounted) setAuthState({ status: 'loading' });

      // 新規ユーザーの場合、usersテーブルレコード作成を待つため少し遅延
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // サブスクリプションチェック完了後に状態を一括更新
      const isSubscribed = await checkSubscriptionStatus(session.user.id);

      if (isMounted) {
        setAuthState({
          status: 'authenticated',
          session,
          isSubscribed,
        });
      }
    });

    // usersテーブルのsubscription_statusの変更を監視
    let realtimeSubscription: any = null;

    async function setupRealtimeSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        realtimeSubscription = supabase
          .channel('subscription-changes')
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

              // 既存の認証状態を維持しつつサブスク状態のみ更新
              setAuthState(prev => {
                if (prev.status !== 'authenticated') return prev;
                return { ...prev, isSubscribed: newSubscriptionStatus };
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
        const isSubscribed = await checkSubscriptionStatus(session.user.id);

        setAuthState({
          status: 'authenticated',
          session,
          isSubscribed,
        });
      }
    });

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
      refreshListener.remove();
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
    };
  }, []);

  // 統一状態から値を取得
  const isLoading = authState.status === 'loading';
  const session = authState.status === 'authenticated' ? authState.session : null;
  const isSubscribed = authState.status === 'authenticated' ? authState.isSubscribed : false;

  // Phase 8.1: Set Sentry user context for crash monitoring
  // Phase 8.3: Set PostHog user identification
  useEffect(() => {
    if (authState.status === 'authenticated') {
      setUserContext(authState.session.user.id, authState.session.user.email);
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
      <NavigationContainer key={language}>
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
      </NavigationContainer>
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

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <NavigationContainer key={language}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              {/* Onboarding flow screens (14 screens total) */}
              <Stack.Screen name="Onboarding0" component={OnboardingScreen0} />
              <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
              <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
              <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
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
          ) : !isSubscribed ? (
            <>
              {/* Authenticated but not subscribed - show Onboarding7-13 + MainTabs for transition */}
              <Stack.Screen name="Onboarding7" component={OnboardingScreen7} />
              <Stack.Screen name="Onboarding8" component={OnboardingScreen8} />
              <Stack.Screen name="Onboarding9" component={OnboardingScreen9} />
              <Stack.Screen name="Onboarding10" component={OnboardingScreen10} />
              <Stack.Screen name="Onboarding11" component={OnboardingScreen11} />
              <Stack.Screen name="Onboarding12" component={OnboardingScreen12} />
              <Stack.Screen name="Onboarding13" component={OnboardingScreen13} />
              <Stack.Screen name="WarpTransition" component={WarpTransitionScreen} />

              {/* Legacy auth screen (for existing users or testing) */}
              {/* Main tabs for direct navigation after subscription */}
              <Stack.Screen name="MainTabs" component={MainTabs} />
            </>
          ) : (
            <>
              {/* Authenticated and subscribed - show MainTabs */}
              <Stack.Screen name="MainTabs" component={MainTabs} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <OfflineBanner />
    </StripeProvider>
  );
}

// Wrap with LanguageProvider, OfflineProvider, and AnalyticsProvider
export default function AppNavigator() {
  return (
    <LanguageProvider>
      <OfflineProvider>
        <AnalyticsProvider>
          <AppNavigatorInner />
        </AnalyticsProvider>
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