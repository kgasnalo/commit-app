import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase, triggerAuthRefresh } from '../../lib/supabase';
import i18n from '../../i18n';
import { getErrorMessage } from '../../utils/errorUtils';

type Plan = 'yearly' | 'monthly';

interface GoogleBook {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
    };
  };
}

export default function OnboardingScreen13({ navigation, route }: any) {
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [deadline, setDeadline] = useState<string>('');
  const [pledgeAmount, setPledgeAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('JPY');
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
          setCurrency(route.params.currency || 'JPY');
        } else {
          // route.paramsがない場合、AsyncStorageから読み込む（認証後のスタック切り替え後）
          const data = await AsyncStorage.getItem('onboardingData');
          if (data) {
            const parsed = JSON.parse(data);
            setSelectedBook(parsed.selectedBook);
            setDeadline(parsed.deadline);
            setPledgeAmount(parsed.pledgeAmount);
            setCurrency(parsed.currency || 'JPY');
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
              currency: currency,
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

      // AppNavigatorに認証状態の再チェックを通知
      // これによりisSubscribedがtrueに更新され、MainTabsスタックに切り替わる
      triggerAuthRefresh();

      // 成功メッセージを表示
      Alert.alert(
        i18n.t('paywall.welcome'),
        i18n.t('paywall.registration_complete'),
        [{
          text: i18n.t('common.ok'),
          // triggerAuthRefresh()が呼ばれたことで、
          // AppNavigatorが自動的にMainTabsスタックに切り替わる
        }]
      );

    } catch (error: unknown) {
      console.error('Subscription error:', error);
      Alert.alert(i18n.t('common.error'), getErrorMessage(error) || i18n.t('errors.subscription_failed', { defaultValue: 'サブスクリプションの開始に失敗しました' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={13}
      totalSteps={14}
      title={i18n.t('onboarding.screen13_title')}
      footer={
        <View>
          <PrimaryButton
            label={selectedPlan === 'yearly' ? i18n.t('onboarding.screen13_start_annual') : i18n.t('onboarding.screen13_monthly_note')}
            onPress={handleSubscribe}
            loading={loading}
          />
          <View style={styles.guarantees}>
            <View style={styles.guarantee}>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
              <Text style={styles.guaranteeText}>{i18n.t('onboarding.screen13_cancel_note')}</Text>
            </View>
            <View style={styles.guarantee}>
              <Ionicons name="checkmark-circle" size={16} color={colors.status.success} />
              <Text style={styles.guaranteeText}>{i18n.t('onboarding.screen13_donation_note')}</Text>
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
          <Text style={styles.planName}>{i18n.t('onboarding.screen13_annual')}</Text>
          <Text style={styles.planPrice}>{i18n.t('onboarding.screen13_annual_price')}</Text>
          <Text style={styles.planDetail}>{i18n.t('onboarding.screen13_annual_note')}</Text>
          <Text style={styles.planLabel}>{i18n.t('paywall.for_serious')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <Text style={styles.planName}>{i18n.t('onboarding.screen13_monthly')}</Text>
          <Text style={styles.planPrice}>{i18n.t('onboarding.screen13_monthly_price')}</Text>
          <Text style={styles.planDetail}>{i18n.t('onboarding.screen13_monthly_note')}</Text>
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
