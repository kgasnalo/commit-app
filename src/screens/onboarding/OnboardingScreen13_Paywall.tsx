import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase } from '../../lib/supabase';

type Plan = 'yearly' | 'monthly';

export default function OnboardingScreen13({ navigation, route }: any) {
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [deadline, setDeadline] = useState<string>('');
  const [pledgeAmount, setPledgeAmount] = useState<number>(0);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [loading, setLoading] = useState(false);

  // オンボーディングデータを読み込む
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        // route.paramsがあればそれを使用（直接遷移の場合）
        if (route.params?.selectedBook) {
          setSelectedBook(route.params.selectedBook);
          setDeadline(route.params.deadline);
          setPledgeAmount(route.params.pledgeAmount);
        } else {
          // route.paramsがない場合、AsyncStorageから読み込む（認証後のスタック切り替え後）
          const data = await AsyncStorage.getItem('onboardingData');
          if (data) {
            const parsed = JSON.parse(data);
            setSelectedBook(parsed.selectedBook);
            setDeadline(parsed.deadline);
            setPledgeAmount(parsed.pledgeAmount);
            console.log('Onboarding data loaded from AsyncStorage');
          } else {
            console.warn('No onboarding data found in AsyncStorage');
          }
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      }
    };

    loadOnboardingData();
  }, [route.params]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 認証状態を確認
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('認証エラーが発生しました。再度ログインしてください。');
      }

      if (!user) {
        console.error('No user found');
        // ユーザーがいない場合、ログイン画面に戻す
        Alert.alert(
          'セッションエラー',
          'ログイン状態が確認できません。再度ログインしてください。',
          [{ text: 'OK', onPress: () => navigation.navigate('Onboarding0') }]
        );
        return;
      }

      console.log('User found:', user.id);

      // subscription_statusを更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ subscription_status: 'active' })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Subscription status updated');

      // コミットメント作成（selectedBookがある場合のみ）
      if (selectedBook && deadline && pledgeAmount) {
        // まず本をbooksテーブルに保存
        const bookData = {
          google_books_id: selectedBook.id,
          title: selectedBook.volumeInfo?.title || 'Unknown',
          author: selectedBook.volumeInfo?.authors?.join(', ') || 'Unknown',
          cover_url: selectedBook.volumeInfo?.imageLinks?.thumbnail || null,
        };

        const { data: book, error: bookError } = await supabase
          .from('books')
          .upsert(bookData, { onConflict: 'google_books_id' })
          .select()
          .single();

        if (bookError) {
          console.error('Book insert error:', bookError);
          // 本の保存エラーは無視して続行（後で追加できる）
        } else if (book) {
          // コミットメント作成
          const { error: commitError } = await supabase
            .from('commitments')
            .insert({
              user_id: user.id,
              book_id: book.id,
              deadline: deadline,
              pledge_amount: pledgeAmount,
              currency: 'JPY',
              status: 'pending',
            });

          if (commitError) {
            console.error('Commitment insert error:', commitError);
            // コミットメントエラーも無視して続行
          }
        }
      }

      // AsyncStorageをクリーンアップ
      await AsyncStorage.removeItem('onboardingData');
      console.log('Onboarding data cleared from AsyncStorage');

      // Realtimeが反応する時間を与える（1秒待機）
      // これにより、AppNavigatorのRealtimeサブスクリプションが
      // subscription_statusの変更を検知してisSubscribedを更新する
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 成功メッセージ
      Alert.alert(
        'ようこそ！',
        'COMMITへの登録が完了しました。',
        [{ text: 'OK' }]
      );

      // AppNavigatorのRealtimeサブスクリプションが
      // subscription_statusの変更を検知してDashboardに自動遷移する

    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert('エラー', error.message || 'サブスクリプションの開始に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={13}
      totalSteps={14}
      title="COMMITを始める"
      footer={
        <View>
          <PrimaryButton
            label={selectedPlan === 'yearly' ? '年額プランで始める' : '月額プランで始める'}
            onPress={handleSubscribe}
            loading={loading}
          />
          <View style={styles.guarantees}>
            <View style={styles.guarantee}>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
              <Text style={styles.guaranteeText}>いつでもキャンセル可能</Text>
            </View>
            <View style={styles.guarantee}>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
              <Text style={styles.guaranteeText}>覚悟金は全額、教育支援に寄付</Text>
            </View>
          </View>
        </View>
      }
    >
      <View style={styles.plans}>
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('yearly')}
        >
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>50% OFF</Text>
          </View>
          <Text style={styles.planName}>年額プラン</Text>
          <Text style={styles.planPrice}>¥3,000/年</Text>
          <Text style={styles.planDetail}>月額換算 ¥250</Text>
          <Text style={styles.planLabel}>本気の人向け</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <Text style={styles.planName}>月額プラン</Text>
          <Text style={styles.planPrice}>¥500/月</Text>
          <Text style={styles.planDetail}>いつでも解約OK</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  plans: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  planBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  planBadgeText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.bold,
  },
  planName: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  planPrice: {
    color: colors.text.primary,
    fontSize: typography.fontSize.headingMedium,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  planDetail: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  planLabel: {
    color: colors.accent.primary,
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.sm,
  },
  guarantees: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  guaranteeText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
});
