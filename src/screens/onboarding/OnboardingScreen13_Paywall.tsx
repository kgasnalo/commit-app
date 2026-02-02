import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SlideToCommit from '../../components/onboarding/SlideToCommit';
import CinematicCommitReveal from '../../components/onboarding/CinematicCommitReveal';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase, triggerAuthRefresh } from '../../lib/supabase';
import { invokeFunctionWithRetry } from '../../lib/supabaseHelpers';
import i18n from '../../i18n';
import { getErrorMessage } from '../../utils/errorUtils';
import * as AnalyticsService from '../../lib/AnalyticsService';
import { captureError } from '../../utils/errorLogger';
import {
  initializeIAP,
  getProducts,
  setPurchaseListener,
  purchaseSubscription,
  IAP_PRODUCT_IDS,
  IAPProduct,
  isIAPAvailable,
} from '../../lib/IAPService';

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
  const [pageCount, setPageCount] = useState<number>(0);
  const [iapProducts, setIapProducts] = useState<IAPProduct[]>([]);
  const [iapLoading, setIapLoading] = useState(false);

  // IAP の初期化と商品情報取得
  useEffect(() => {
    const initIAP = async () => {
      if (!isIAPAvailable()) {
        if (__DEV__) console.log('[Screen13] IAP not available on this platform');
        return;
      }

      setIapLoading(true);
      try {
        const initialized = await initializeIAP();
        if (!initialized) {
          if (__DEV__) console.warn('[Screen13] IAP initialization failed');
          return;
        }

        // 商品情報を取得
        const products = await getProducts();
        if (__DEV__) console.log('[Screen13] IAP products loaded:', products);
        setIapProducts(products);

        // 購入リスナーを設定
        setPurchaseListener(
          async (productId, transactionId) => {
            if (__DEV__) console.log('[Screen13] Purchase success:', productId, transactionId);
            // 購入成功時の処理は handleSubscribe 内で継続
          },
          (error) => {
            if (__DEV__) console.error('[Screen13] Purchase error:', error);

            // Sentryにエラーを送信（デバッグ用）
            captureError(new Error(`IAP purchase failed: ${error}`), {
              location: 'OnboardingScreen13.purchaseListener',
              extra: { errorMessage: error },
            });

            setLoading(false);

            // エラーコード別のメッセージ表示
            let errorMessage = i18n.t('errors.iap_purchase_failed');
            if (error.includes('verification failed') || error.includes('Receipt verification')) {
              errorMessage = i18n.t('errors.iap_receipt_invalid');
            } else if (error.includes('STORE_CONNECTION') || error.includes('store')) {
              errorMessage = i18n.t('errors.iap_store_connection_failed');
            }

            Alert.alert(i18n.t('common.error'), errorMessage);
          }
        );
      } catch (error) {
        captureError(error, { location: 'OnboardingScreen13.initIAP' });
      } finally {
        setIapLoading(false);
      }
    };

    initIAP();
  }, []);

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
          // route.paramsにtargetPagesがあれば設定
          if (route.params?.targetPages) {
            setPageCount(route.params.targetPages);
          }
        } else {
          // route.paramsがない場合、AsyncStorageから読み込む（認証後のスタック切り替え後）
          const data = await AsyncStorage.getItem('onboardingData');
          if (data) {
            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch (parseError) {
              captureError(parseError, { location: 'OnboardingScreen13.loadOnboardingData' });
              setPageCount(100);
              return;
            }
            setSelectedBook(parsed.selectedBook);
            setDeadline(parsed.deadline);
            setPledgeAmount(parsed.pledgeAmount);
            setCurrency(parsed.currency || 'JPY');

            // AsyncStorageから復元した場合、targetPagesがないのでGoogle Books APIから取得
            if (parsed.selectedBook?.id) {
              try {
                if (__DEV__) console.log('[Screen13] Fetching book detail for pageCount:', parsed.selectedBook.id);
                const response = await fetch(
                  `https://www.googleapis.com/books/v1/volumes/${parsed.selectedBook.id}`
                );
                if (!response.ok) {
                  if (__DEV__) console.warn(`[Screen13] Google Books API returned ${response.status}`);
                  setPageCount(100);
                  return;
                }
                const detail = await response.json();
                const count = detail?.volumeInfo?.pageCount;
                if (count && count > 0) {
                  if (__DEV__) console.log('[Screen13] Got pageCount from API:', count);
                  setPageCount(count);
                } else {
                  if (__DEV__) console.log('[Screen13] No pageCount in API, using fallback: 100');
                  setPageCount(100);
                }
              } catch (fetchError) {
                if (__DEV__) console.warn('[Screen13] Failed to fetch book detail:', fetchError);
                setPageCount(100);
              }
            }
          } else {
            if (__DEV__) console.warn('No onboarding data found in AsyncStorage');
          }
        }
      } catch (error) {
        captureError(error, { location: 'OnboardingScreen13.loadOnboardingData.outer' });
      }
    };

    loadOnboardingData();
  }, [route.params]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      if (__DEV__) console.log('[Screen13] Starting subscription flow...');

      // iOS の場合は IAP を使用
      if (Platform.OS === 'ios' && isIAPAvailable()) {
        const productId = selectedPlan === 'yearly'
          ? IAP_PRODUCT_IDS.YEARLY
          : IAP_PRODUCT_IDS.MONTHLY;

        if (__DEV__) console.log('[Screen13] Starting IAP purchase for:', productId);

        // IAP 購入を開始
        const result = await purchaseSubscription(productId);

        if (!result.success) {
          if (__DEV__) console.error('[Screen13] IAP purchase initiation failed:', result.error);
          // ユーザーがキャンセルした場合はエラー表示しない
          if (result.error && !result.error.includes('canceled') && !result.error.includes('cancelled')) {
            Alert.alert(i18n.t('common.error'), i18n.t('errors.iap_purchase_failed'));
          }
          setLoading(false);
          return;
        }

        // 購入処理は purchaseListener で継続される
        // verify-iap-receipt が subscription_status を更新する
        // ここでは購入開始を待つ（リスナーが成功を検知したら続行）

        // 購入完了を待つためのポーリング（最大30秒）
        let attempts = 0;
        const maxAttempts = 30;
        let subscriptionActivated = false;

        const checkSubscription = async (): Promise<boolean> => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return false;

          const { data, error } = await supabase
            .from('users')
            .select('subscription_status')
            .eq('id', user.id)
            .single();

          return !error && data?.subscription_status === 'active';
        };

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const isActive = await checkSubscription();
          if (isActive) {
            if (__DEV__) console.log('[Screen13] Subscription activated!');
            subscriptionActivated = true;
            break;
          }
          attempts++;
        }

        if (!subscriptionActivated) {
          // タイムアウト：subscription_statusがactiveにならなかった
          // CRITICAL: ここで続行するとIAP購入済みなのにコミットメント作成に進んでしまう
          if (__DEV__) console.error('[Screen13] Subscription check timed out - subscription not activated');
          captureError(new Error('IAP subscription verification timed out'), {
            location: 'OnboardingScreen13.handleSubscribe.pollTimeout',
            extra: { attempts, maxAttempts },
          });

          setLoading(false);
          Alert.alert(
            i18n.t('common.error'),
            i18n.t('errors.iap_verification_timeout'),
            [
              {
                text: i18n.t('common.retry'),
                onPress: () => handleSubscribe(), // リトライ
              },
              {
                text: i18n.t('common.cancel'),
                style: 'cancel',
              },
            ]
          );
          return; // CRITICAL: 続行を禁止
        }
      }

      // Step 1: セッションをリフレッシュして最新のトークンを取得
      // INITIAL_SESSION（AsyncStorageから復元）のトークンが期限切れの可能性があるため、
      // functions.invoke()を呼ぶ前に明示的にリフレッシュする
      if (__DEV__) console.log('[Screen13] Refreshing session to get fresh token...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        captureError(refreshError, { location: 'OnboardingScreen13.handleSubscribe.refreshSession' });
        Alert.alert(
          i18n.t('paywall.session_error'),
          i18n.t('paywall.session_invalid'),
          [{ text: i18n.t('common.ok'), onPress: () => navigation.navigate('Onboarding0') }]
        );
        return;
      }

      const session = refreshData.session;
      if (!session?.user?.id) {
        captureError(new Error('No valid session after refresh'), { location: 'OnboardingScreen13.handleSubscribe' });
        Alert.alert(
          i18n.t('paywall.session_error'),
          i18n.t('paywall.session_invalid'),
          [{ text: i18n.t('common.ok'), onPress: () => navigation.navigate('Onboarding0') }]
        );
        return;
      }

      if (__DEV__) console.log('[Screen13] Session refreshed successfully');
      // Token expiry removed for security

      // Step 2: データソースを確定（stateよりもroute.paramsを優先、なければstate）
      const bookToCommit = route.params?.selectedBook || selectedBook;
      const deadlineToCommit = route.params?.deadline || deadline;
      const pledgeToCommit = route.params?.pledgeAmount || pledgeAmount;
      const currencyToCommit = route.params?.currency || currency;
      const targetPagesToCommit = route.params?.targetPages || pageCount || 100;

      // コミットメント作成（bookToCommitがある場合のみ）
      if (!bookToCommit || !deadlineToCommit || !pledgeToCommit) {
        captureError(new Error('Missing commitment data'), {
          location: 'OnboardingScreen13.handleSubscribe',
          extra: { hasBook: !!bookToCommit, hasDeadline: !!deadlineToCommit, hasPledge: !!pledgeToCommit },
        });
        Alert.alert(i18n.t('common.error'), i18n.t('paywall.missing_data'));
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
        book_total_pages: targetPagesToCommit, // Edge Functionの再取得時のAPIミスマッチを防ぐため、クライアント側で取得したページ数を使用
        is_manual_entry: false,
        deadline: deadlineToCommit,
        pledge_amount: pledgeToCommit,
        currency: currencyToCommit,
        target_pages: targetPagesToCommit,
      };
      if (__DEV__) console.log('[Screen13] Creating commitment via supabase.functions.invoke...');
      if (__DEV__) console.log('[Screen13] Request body:', JSON.stringify(requestBody, null, 2));

      // SDK の functions.invoke() を使用（トークン管理が自動化される）
      // WORKER_ERROR 対策としてリトライロジックを使用
      const { data: commitmentData, error: invokeError } = await invokeFunctionWithRetry<{
        success: boolean;
        commitment_id: string;
        book_id: string;
      }>('create-commitment', requestBody);

      if (invokeError) {
        captureError(invokeError, { location: 'OnboardingScreen13.handleSubscribe.createCommitment' });

        // エンリッチドエラーから詳細情報を抽出
        let detailedErrorMessage = `Commitment creation failed: ${invokeError.message}`;

        // invokeFunctionWithRetryがエンリッチしたエラー情報を使用（bodyは既に消費済み）
        const enrichedError = invokeError as Error & { _parsedBody?: Record<string, unknown> | null; _responseText?: string };
        if (enrichedError._parsedBody) {
          const errorBody = enrichedError._parsedBody;
          if (__DEV__) console.error('[Screen13] Full error body:', JSON.stringify(errorBody));
          const errorCode = errorBody.error || errorBody.code || errorBody.message || 'UNKNOWN';
          const errorDetails = errorBody.details || errorBody.msg || '';
          detailedErrorMessage = `Commitment creation failed: ${errorCode}${errorDetails ? ' - ' + errorDetails : ''}`;
        } else if (enrichedError._responseText) {
          if (__DEV__) console.error('[Screen13] Error text:', enrichedError._responseText);
        }
        throw new Error(detailedErrorMessage);
      }

      if (__DEV__) console.log('[Screen13] Commitment created successfully:', commitmentData);

      // Note: subscription_status更新はhandleWarpComplete()で実行
      // ここで更新するとRealtimeが発火し、アニメーション表示前にスタックが切り替わってしまう

      // Step 4: Success (Cinematic COMMIT Reveal)
      await AsyncStorage.removeItem('onboardingData');

      // Phase 8.3: Track onboarding completion
      AnalyticsService.onboardingCompleted({ plan_type: selectedPlan });

      // Start cinematic reveal animation
      setShowWarpTransition(true);

    } catch (error: unknown) {
      captureError(error, { location: 'OnboardingScreen13.handleSubscribe' });
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
        captureError(new Error('No session in handleWarpComplete'), { location: 'OnboardingScreen13.handleWarpComplete' });
        triggerAuthRefresh();
        return;
      }

      // Step 2: onboarding_completedのみを更新（アニメーション完了後に実行）
      // CRITICAL: subscription_statusはverify-iap-receiptで既に更新済み
      // ここで再度更新するとRealtimeが二重発火し、ナビゲーションエラーの原因になる
      if (__DEV__) console.log('[Screen13] Updating onboarding_completed to true...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
        })
        .eq('id', session.user.id);

      if (updateError) {
        captureError(updateError, { location: 'OnboardingScreen13.handleWarpComplete.update' });
      } else {
        if (__DEV__) console.log('[Screen13] onboarding_completed=true ✅');
      }

      // Step 3: Dashboard側でフェードインするためのフラグを設定
      await AsyncStorage.setItem('showDashboardFadeIn', 'true');
    } catch (error) {
      captureError(error, { location: 'OnboardingScreen13.handleWarpComplete' });
    }

    // Step 4: AppNavigatorに認証状態の再チェックを通知
    // これによりisSubscribedがtrueに更新され、MainTabsスタックに切り替わる
    triggerAuthRefresh();
  }, []);

  // IAP から取得した価格を表示用にフォーマット
  const getDisplayPrice = (productId: string): string => {
    const product = iapProducts.find(p => p.productId === productId);
    if (product) {
      return product.price;
    }
    // フォールバック（IAP が利用できない場合）
    return productId === IAP_PRODUCT_IDS.YEARLY
      ? i18n.t('onboarding.screen13_annual_price')
      : i18n.t('onboarding.screen13_monthly_price');
  };

  return (
    <>
      <CinematicCommitReveal
        visible={showWarpTransition}
        onComplete={handleWarpComplete}
      />
      <OnboardingLayout
      currentStep={14}
      totalSteps={15}
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
      {iapLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>50% OFF</Text>
            </View>
            <Text style={styles.planName}>{i18n.t('onboarding.screen13_annual')}</Text>
            <Text style={styles.planPrice}>{getDisplayPrice(IAP_PRODUCT_IDS.YEARLY)}</Text>
            <Text style={styles.planDetail}>{i18n.t('onboarding.screen13_annual_note')}</Text>
            <Text style={styles.planLabel}>{i18n.t('paywall.for_serious')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={styles.planName}>{i18n.t('onboarding.screen13_monthly')}</Text>
            <Text style={styles.planPrice}>{getDisplayPrice(IAP_PRODUCT_IDS.MONTHLY)}</Text>
            <Text style={styles.planDetail}>{i18n.t('onboarding.screen13_monthly_note')}</Text>
          </TouchableOpacity>
        </View>
      )}
      </OnboardingLayout>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
