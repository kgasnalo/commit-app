import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SlideToCommit from '../../components/onboarding/SlideToCommit';
import CinematicCommitReveal from '../../components/onboarding/CinematicCommitReveal';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, triggerAuthRefresh } from '../../lib/supabase';
import i18n from '../../i18n';
import { getErrorMessage } from '../../utils/errorUtils';
import * as AnalyticsService from '../../lib/AnalyticsService';

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
  const [showWarpTransition, setShowWarpTransition] = useState(false);

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
      console.log('[Screen13] Starting subscription flow...');

      // Step 1: セッションをリフレッシュして最新のトークンを取得
      // INITIAL_SESSION（AsyncStorageから復元）のトークンが期限切れの可能性があるため、
      // functions.invoke()を呼ぶ前に明示的にリフレッシュする
      console.log('[Screen13] Refreshing session to get fresh token...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('[Screen13] Session refresh failed:', refreshError.message);
        Alert.alert(
          i18n.t('paywall.session_error'),
          i18n.t('paywall.session_invalid'),
          [{ text: i18n.t('common.ok'), onPress: () => navigation.navigate('Onboarding0') }]
        );
        return;
      }

      const session = refreshData.session;
      if (!session?.user?.id) {
        console.error('[Screen13] No valid session after refresh');
        Alert.alert(
          i18n.t('paywall.session_error'),
          i18n.t('paywall.session_invalid'),
          [{ text: i18n.t('common.ok'), onPress: () => navigation.navigate('Onboarding0') }]
        );
        return;
      }

      console.log('[Screen13] Session refreshed, user:', session.user.id);
      console.log('[Screen13] Token expires at:', new Date(session.expires_at! * 1000).toISOString());

      // Step 2: データソースを確定（stateよりもroute.paramsを優先、なければstate）
      const bookToCommit = route.params?.selectedBook || selectedBook;
      const deadlineToCommit = route.params?.deadline || deadline;
      const pledgeToCommit = route.params?.pledgeAmount || pledgeAmount;
      const currencyToCommit = route.params?.currency || currency;
      const targetPagesToCommit = route.params?.targetPages || 0;

      // コミットメント作成（bookToCommitがある場合のみ）
      if (!bookToCommit || !deadlineToCommit || !pledgeToCommit) {
        console.error('[Screen13] Missing commitment data:', { bookToCommit, deadlineToCommit, pledgeToCommit });
        Alert.alert('Error', 'Commitment data is missing. Please restart onboarding.');
        return;
      }

      // Step 3: Edge Function でコミットメント作成
      // supabase.functions.invoke()を使用することで、SDKが内部でトークン管理を行う
      // これにより、トークンのリフレッシュやヘッダー設定が自動的に処理される

      // リクエストボディをログ（デバッグ用）
      const requestBody = {
        google_books_id: bookToCommit.id,
        book_title: bookToCommit.volumeInfo?.title || 'Unknown',
        book_author: bookToCommit.volumeInfo?.authors?.join(', ') || 'Unknown',
        book_cover_url: bookToCommit.volumeInfo?.imageLinks?.thumbnail || null,
        book_total_pages: null, // オンボーディングでは未取得
        is_manual_entry: false,
        deadline: deadlineToCommit,
        pledge_amount: pledgeToCommit,
        currency: currencyToCommit,
        target_pages: targetPagesToCommit,
      };
      console.log('[Screen13] Creating commitment via supabase.functions.invoke...');
      console.log('[Screen13] Request body:', JSON.stringify(requestBody, null, 2));

      // SDK の functions.invoke() を使用（トークン管理が自動化される）
      const { data: commitmentData, error: invokeError } = await supabase.functions.invoke(
        'create-commitment',
        { body: requestBody }
      );

      if (invokeError) {
        console.error('[Screen13] Commitment creation error:', invokeError);

        // FunctionsHttpError から詳細なエラー情報を抽出
        if (invokeError instanceof FunctionsHttpError) {
          try {
            const errorBody = await invokeError.context.json();
            // 完全なエラーボディをログに出力して構造を確認
            console.error('[Screen13] Full error body:', JSON.stringify(errorBody));
            const errorCode = errorBody.error || errorBody.code || errorBody.message || 'UNKNOWN';
            const errorDetails = errorBody.details || errorBody.msg || '';
            throw new Error(`Commitment creation failed: ${errorCode} - ${errorDetails}`);
          } catch (parseError) {
            // JSON パースに失敗した場合、テキストとして取得を試みる
            try {
              const errorText = await invokeError.context.text();
              console.error('[Screen13] Error response (text):', errorText);
            } catch {
              console.error('[Screen13] Failed to get error response');
            }
          }
        }
        throw new Error(`Commitment creation failed: ${invokeError.message}`);
      }

      console.log('[Screen13] Commitment created successfully:', commitmentData);

      // Note: subscription_status更新はhandleWarpComplete()で実行
      // ここで更新するとRealtimeが発火し、アニメーション表示前にスタックが切り替わってしまう

      // Step 4: Success (Cinematic COMMIT Reveal)
      await AsyncStorage.removeItem('onboardingData');

      // Phase 8.3: Track onboarding completion
      AnalyticsService.onboardingCompleted({ plan_type: selectedPlan });

      // Start cinematic reveal animation
      setShowWarpTransition(true);

    } catch (error: unknown) {
      console.error('[Screen13] Subscription error:', error);
      Alert.alert(i18n.t('common.error'), getErrorMessage(error) || i18n.t('errors.subscription_failed'));
    } finally {
      setLoading(false);
    }
  };

  // シネマティック遷移完了時のコールバック
  const handleWarpComplete = useCallback(async () => {
    try {
      // Step 1: セッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('[Screen13] No session in handleWarpComplete');
        triggerAuthRefresh();
        return;
      }

      // Step 2: subscription_statusとonboarding_completedを更新（アニメーション完了後に実行）
      // Note: handleSubscribe()ではなくここで更新することで、
      // Realtimeがアニメーション完了前に発火することを防ぐ
      console.log('[Screen13] Updating subscription_status to active and onboarding_completed to true...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          onboarding_completed: true,
        })
        .eq('id', session.user.id);

      if (updateError) {
        console.error('[Screen13] Update error:', updateError);
      } else {
        console.log('[Screen13] subscription_status=active, onboarding_completed=true ✅');
      }

      // Step 3: Dashboard側でフェードインするためのフラグを設定
      await AsyncStorage.setItem('showDashboardFadeIn', 'true');
    } catch (error) {
      console.error('[Screen13] handleWarpComplete error:', error);
    }

    // Step 4: AppNavigatorに認証状態の再チェックを通知
    // これによりisSubscribedがtrueに更新され、MainTabsスタックに切り替わる
    triggerAuthRefresh();
  }, []);

  return (
    <>
      <CinematicCommitReveal
        visible={showWarpTransition}
        onComplete={handleWarpComplete}
      />
      <OnboardingLayout
      currentStep={13}
      totalSteps={14}
      title={i18n.t('onboarding.screen13_title')}
      footer={
        <View>
          <SlideToCommit
            label={i18n.t('onboarding.screen13_slide_to_commit')}
            onComplete={handleSubscribe}
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
    </>
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
