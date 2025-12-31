import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StripeProvider } from '@stripe/stripe-react-native';

import AuthScreen from '../screens/AuthScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import CreateCommitmentScreen from '../screens/CreateCommitmentScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VerificationScreen from '../screens/VerificationScreen';
import CommitmentDetailScreen from '../screens/CommitmentDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

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

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // セッションとサブスク状態の初期確認
    checkUserStatus();

    // 認証状態の変化を監視
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state change:', _event, session?.user?.id);
      setSession(session);
      if (session) {
        // 新規ユーザーの場合、usersテーブルレコード作成を待つため少し遅延
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        await checkSubscription(session.user.id);
      } else {
        setIsSubscribed(false);
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
              if (payload.new.subscription_status === 'active') {
                setIsSubscribed(true);
              } else {
                setIsSubscribed(false);
              }
            }
          )
          .subscribe();
      }
    }

    setupRealtimeSubscription();

    return () => {
      authSubscription.unsubscribe();
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
    };
  }, []);

  async function checkUserStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) {
      await checkSubscription(session.user.id);
    }
    setLoading(false);
  }

  async function checkSubscription(userId: string, retryCount = 0) {
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
          return checkSubscription(userId, retryCount + 1);
        }

        setIsSubscribed(false);
        return;
      }

      if (data && data.subscription_status === 'active') {
        console.log('User subscription is active');
        setIsSubscribed(true);
      } else {
        console.log('User subscription is inactive or not found:', data?.subscription_status);
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Unexpected error checking subscription:', err);
      setIsSubscribed(false);
    }
  }

  if (loading) return null;

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}>
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
              {/* Authenticated but not subscribed - show Onboarding7-13 */}
              <Stack.Screen name="Onboarding7" component={OnboardingScreen7} />
              <Stack.Screen name="Onboarding8" component={OnboardingScreen8} />
              <Stack.Screen name="Onboarding9" component={OnboardingScreen9} />
              <Stack.Screen name="Onboarding10" component={OnboardingScreen10} />
              <Stack.Screen name="Onboarding11" component={OnboardingScreen11} />
              <Stack.Screen name="Onboarding12" component={OnboardingScreen12} />
              <Stack.Screen name="Onboarding13" component={OnboardingScreen13} />
            </>
          ) : (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
              <Stack.Screen name="CreateCommitment" component={CreateCommitmentScreen} />
              <Stack.Screen name="CommitmentDetail" component={CommitmentDetailScreen} />
              <Stack.Screen name="Verification" component={VerificationScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}
