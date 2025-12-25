import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

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
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
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

      Alert.alert('成功', 'サブスクリプションが開始されました。', [
        { text: 'OK', onPress: onComplete }
      ]);
    } catch (error: any) {
      Alert.alert('エラー', error.message);
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
        
        <Text style={styles.title}>規律への投資</Text>
        <Text style={styles.description}>
          COMMITを利用するには、月額プランへの加入が必要です。この投資が、あなたの規律を資産に変える第一歩となります。
        </Text>

        <View style={styles.planCard}>
          <Text style={styles.planName}>月額プラン</Text>
          <Text style={styles.planPrice}>¥980<Text style={styles.planPeriod}> / 月</Text></Text>
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <MaterialIcons name="check" size={20} color="#000" />
              <Text style={styles.featureText}>無制限のコミットメント作成</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check" size={20} color="#000" />
              <Text style={styles.featureText}>AIによる実行証明</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check" size={20} color="#000" />
              <Text style={styles.featureText}>規律のアーカイブ化</Text>
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
            <Text style={styles.subscribeButtonText}>サブスクリプションを開始する</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          ※いつでも解約可能です。決済はStripeを通じて安全に行われます。
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
