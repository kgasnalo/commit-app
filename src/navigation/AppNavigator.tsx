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

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // セッションとサブスク状態の初期確認
    checkUserStatus();

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

    return () => subscription.unsubscribe();
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
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : !isSubscribed ? (
            <Stack.Screen name="Subscription">
              {(props) => <SubscriptionScreen {...props} onComplete={() => setIsSubscribed(true)} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
              <Stack.Screen name="CreateCommitment" component={CreateCommitmentScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}
