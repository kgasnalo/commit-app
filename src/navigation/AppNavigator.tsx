import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, AUTH_REFRESH_EVENT } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StripeProvider } from '@stripe/stripe-react-native';
import { colors } from '../theme/colors';
import i18n from '../i18n';
import { STRIPE_PUBLISHABLE_KEY } from '../config/env';

// 統一された認証状態型
type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: Session; isSubscribed: boolean };

import AuthScreen from '../screens/AuthScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import CreateCommitmentScreen from '../screens/CreateCommitmentScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VerificationScreen from '../screens/VerificationScreen';
import CommitmentDetailScreen from '../screens/CommitmentDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import BookDetailScreen from '../screens/BookDetailScreen';

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

// Settings Stack Navigator
function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator (for authenticated and subscribed users)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#1A1A1A',
          height: 85,
          paddingBottom: 30,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#FF4D00',
        tabBarInactiveTintColor: '#666666',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.library'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: i18n.t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  // 統一された認証状態（フリッカー防止のためアトミックに更新）
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  // サブスクリプション状態を確認する純粋関数（boolean を返す）
  async function checkSubscriptionStatus(userId: string, retryCount = 0): Promise<boolean> {
    const maxRetries = 3;
    try {
      console.log(`Checking subscription for user ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      const { data, error } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Subscription check error:', error);

        // usersテーブルにレコードが見つからない場合、リトライ
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`User record not found, retrying in ${(retryCount + 1) * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return checkSubscriptionStatus(userId, retryCount + 1);
        }

        return false;
      }

      const isActive = data?.subscription_status === 'active';
      console.log('User subscription is:', isActive ? 'active' : 'inactive');
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
      console.log('Auth state change:', event, session?.user?.id);

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
              console.log('Subscription status changed:', payload);
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
      console.log('[AppNavigator] Received REFRESH_AUTH event, re-checking auth state...');

      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        const isSubscribed = await checkSubscriptionStatus(session.user.id);
        console.log('[AppNavigator] Refreshed subscription status:', isSubscribed);

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

  // ローディング中はブランドローディング画面を表示
  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#000" />
        <View style={loadingStyles.textContainer}>
          <Text style={loadingStyles.title}>COMMIT</Text>
          <Text style={loadingStyles.subtitle}>{i18n.t('auth.subtitle')}</Text>
        </View>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <NavigationContainer>
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
    </StripeProvider>
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
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    letterSpacing: 2,
  },
  spinner: {
    marginTop: 32,
  },
});
