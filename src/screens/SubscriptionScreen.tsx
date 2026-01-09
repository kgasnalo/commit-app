import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { STRIPE_PUBLISHABLE_KEY } from '../config/env';
import { getErrorMessage } from '../utils/errorUtils';
import i18n from '../i18n';

export default function SubscriptionScreen({ onComplete }: { onComplete: () => void }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const fetchPaymentSheetParams = async () => {
    // 本来はSupabase Edge Functions等でStripe APIを叩いて作成しますが、
    // MVPのデモ用として、成功したとみなすフローを構築します。
    // 実際の実装ではここでサーバーサイドから paymentIntent, customer, ephemeralKey を取得します。
    return {
      paymentIntent: 'pi_demo_123',
      ephemeralKey: 'ek_demo_123',
      customer: 'cus_demo_123',
      publishableKey: STRIPE_PUBLISHABLE_KEY,
    };
  };

  const handleSubscribe = async () => {
    setLoading(true);
    
    // 1. Stripeのセットアップ（シミュレーション）
    // 実際にはここでStripeのPaymentSheetを初期化・表示しますが、
    // 今回はMVPのUI/UXフローを優先し、決済成功後のDB更新ロジックを実装します。
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // 2. Supabaseのユーザー情報を更新
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_status: 'active',
          role: 'Other' // 初期値
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        i18n.t('subscription.success_alert_title'),
        i18n.t('subscription.success_alert_message'),
        [{ text: i18n.t('common.ok'), onPress: onComplete }]
      );
    } catch (error: unknown) {
      Alert.alert(
        i18n.t('common.error'),
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="verified-user" size={80} color="#000" />
        </View>
        
        <Text style={styles.title}>{i18n.t('subscription.title')}</Text>
        <Text style={styles.description}>
          {i18n.t('subscription.description')}
        </Text>

        <View style={styles.planCard}>
          <Text style={styles.planName}>{i18n.t('subscription.plan_monthly')}</Text>
          <Text style={styles.planPrice}>
            {i18n.t('subscription.price', { price: '¥980' }).replace('/month', '').replace('/月', '')}
            <Text style={styles.planPeriod}>{i18n.t('subscription.plan_period')}</Text>
          </Text>
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <MaterialIcons name="check" size={20} color="#000" />
              <Text style={styles.featureText}>{i18n.t('subscription.feature_unlimited')}</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check" size={20} color="#000" />
              <Text style={styles.featureText}>{i18n.t('subscription.feature_ai')}</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check" size={20} color="#000" />
              <Text style={styles.featureText}>{i18n.t('subscription.feature_archive')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.subscribeButton} 
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>{i18n.t('subscription.start_button')}</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          {i18n.t('subscription.cancel_note')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  planCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#f9f9f9',
    marginBottom: 40,
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000',
    marginVertical: 8,
  },
  planPeriod: {
    fontSize: 18,
    fontWeight: '400',
    color: '#666',
  },
  features: {
    marginTop: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
  subscribeButton: {
    backgroundColor: '#000',
    width: '100%',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 24,
    textAlign: 'center',
  },
});
