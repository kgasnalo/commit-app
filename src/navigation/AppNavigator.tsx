import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StripeProvider } from '@stripe/stripe-react-native';

import AuthScreen from '../screens/AuthScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // セッションとサブスク状態の初期確認
    checkUserStatus();

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkSubscription(session.user.id);
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

  async function checkSubscription(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();
    
    if (data && data.subscription_status === 'active') {
      setIsSubscribed(true);
    } else {
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
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}
