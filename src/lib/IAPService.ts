/**
 * IAPService - Apple In-App Purchase サービス
 *
 * iOS のサブスクリプション購入を管理するサービス。
 * - 商品情報の取得
 * - 購入フロー
 * - 購入の復元
 * - 購入完了リスナー
 *
 * 注意: このサービスは iOS でのみ動作します。
 */

import { Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from './supabase';
import { captureError } from '../utils/errorLogger';

// 商品ID（App Store Connect で登録する必要がある）
export const IAP_PRODUCT_IDS = {
  YEARLY: 'com.kgxxx.commitapp.premium.yearly',
  MONTHLY: 'com.kgxxx.commitapp.premium.monthly',
} as const;

export type IAPProductId = (typeof IAP_PRODUCT_IDS)[keyof typeof IAP_PRODUCT_IDS];

// 商品情報の型
export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

// 購入結果の型
export interface IAPPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  error?: string;
}

// IAPの初期化状態
let isInitialized = false;

/**
 * IAP を初期化する
 * アプリ起動時に一度だけ呼び出す
 */
export async function initializeIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    if (__DEV__) console.log('[IAPService] iOS only - skipping initialization');
    return false;
  }

  if (isInitialized) {
    if (__DEV__) console.log('[IAPService] Already initialized');
    return true;
  }

  try {
    // IAP ストアに接続
    await InAppPurchases.connectAsync();
    isInitialized = true;
    if (__DEV__) console.log('[IAPService] Initialized successfully');
    return true;
  } catch (error) {
    captureError(error, { location: 'IAPService.initializeIAP' });
    if (__DEV__) console.error('[IAPService] Initialization failed:', error);
    return false;
  }
}

/**
 * IAP 接続を切断する
 * アプリ終了時に呼び出す
 */
export async function disconnectIAP(): Promise<void> {
  if (!isInitialized) return;

  try {
    await InAppPurchases.disconnectAsync();
    isInitialized = false;
    if (__DEV__) console.log('[IAPService] Disconnected');
  } catch (error) {
    captureError(error, { location: 'IAPService.disconnectIAP' });
  }
}

/**
 * 商品情報を取得する
 * ネットワーク問題に対応するため、リトライロジックを含む
 */
export async function getProducts(): Promise<IAPProduct[]> {
  if (Platform.OS !== 'ios') {
    return [];
  }

  if (!isInitialized) {
    const initialized = await initializeIAP();
    if (!initialized) return [];
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { results, responseCode } = await InAppPurchases.getProductsAsync([
        IAP_PRODUCT_IDS.YEARLY,
        IAP_PRODUCT_IDS.MONTHLY,
      ]);

      if (__DEV__) {
        console.log(`[IAPService] getProducts attempt ${attempt}/${MAX_RETRIES}:`, {
          responseCode,
          resultCount: results?.length ?? 0,
          productIds: results?.map(p => p.productId) ?? [],
        });
      }

      if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
        if (__DEV__) console.warn('[IAPService] responseCode:', responseCode);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
          continue;
        }
        return [];
      }

      if (!results || results.length === 0) {
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
          continue;
        }
        return [];
      }

      // expo-in-app-purchases の形式から IAPProduct に変換
      return results.map((product) => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        priceAmountMicros: product.priceAmountMicros,
        priceCurrencyCode: product.priceCurrencyCode,
      }));
    } catch (error) {
      captureError(error, { location: 'IAPService.getProducts', extra: { attempt } });
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      return [];
    }
  }

  return [];
}

/**
 * 購入リスナーを設定する
 * 購入完了時にサーバー検証を行う
 */
export function setPurchaseListener(
  onSuccess: (productId: string, orderId: string) => void,
  onError: (error: string) => void
): void {
  if (Platform.OS !== 'ios') return;

  InAppPurchases.setPurchaseListener(async (result: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>) => {
    const { responseCode, results } = result;

    if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
      for (const purchase of results) {
        if (!purchase.acknowledged) {
          try {
            // サーバーでレシートを検証
            const verified = await verifyPurchaseOnServer(purchase);

            if (verified) {
              // 購入を承認（必須）
              await InAppPurchases.finishTransactionAsync(purchase, true);
              onSuccess(purchase.productId, purchase.orderId ?? 'unknown');
            } else {
              onError('Receipt verification failed');
            }
          } catch (error) {
            captureError(error, { location: 'IAPService.purchaseListener' });
            onError('Purchase processing failed');
          }
        }
      }
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      // ユーザーがキャンセル - エラーとして扱わない
      if (__DEV__) console.log('[IAPService] User cancelled purchase');
    } else {
      onError(`Purchase failed with code: ${responseCode}`);
    }
  });
}

/**
 * サブスクリプションを購入する
 */
export async function purchaseSubscription(productId: IAPProductId): Promise<IAPPurchaseResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'iOS only' };
  }

  if (!isInitialized) {
    const initialized = await initializeIAP();
    if (!initialized) {
      return { success: false, error: 'IAP initialization failed' };
    }
  }

  try {
    // FIX: 購入前に商品を再クエリしてネイティブキャッシュを確実に有効化
    // expo-in-app-purchasesのネイティブモジュールは、getProductsAsync()で取得した
    // 商品のキャッシュを保持し、purchaseItemAsync()呼び出し時にこのキャッシュを参照する。
    // アプリのバックグラウンド化やネットワーク問題でキャッシュがクリアされると
    // "Must query item from store before calling purchase" エラーが発生する。
    const products = await getProducts();
    if (products.length === 0) {
      if (__DEV__) console.warn('[IAPService] No products returned from store');
      return { success: false, error: 'STORE_CONNECTION_FAILED' };
    }
    if (!products.some(p => p.productId === productId)) {
      if (__DEV__) console.warn('[IAPService] Product not found:', productId);
      return { success: false, error: 'PRODUCT_NOT_FOUND' };
    }

    // 購入を開始（結果はリスナーで受け取る）
    await InAppPurchases.purchaseItemAsync(productId);

    // 購入開始成功を返す
    // 実際の購入完了は purchaseListener で処理される
    return { success: true };
  } catch (error) {
    captureError(error, { location: 'IAPService.purchaseSubscription', extra: { productId } });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 購入を復元する
 */
export async function restorePurchases(): Promise<IAPPurchaseResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'iOS only' };
  }

  if (!isInitialized) {
    const initialized = await initializeIAP();
    if (!initialized) {
      return { success: false, error: 'IAP initialization failed' };
    }
  }

  try {
    const { results, responseCode } = await InAppPurchases.getPurchaseHistoryAsync();

    if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
      return { success: false, error: `Restore failed with code: ${responseCode}` };
    }

    if (!results || results.length === 0) {
      return { success: false, error: 'NO_PURCHASES_FOUND' };
    }

    // 有効な購入を探す
    for (const purchase of results) {
      // サーバーで検証
      const verified = await verifyPurchaseOnServer(purchase);
      if (verified) {
        return {
          success: true,
          productId: purchase.productId,
          transactionId: purchase.orderId ?? undefined,
        };
      }
    }

    return { success: false, error: 'No valid purchases found' };
  } catch (error) {
    captureError(error, { location: 'IAPService.restorePurchases' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * サーバーでレシートを検証する
 */
async function verifyPurchaseOnServer(
  purchase: InAppPurchases.InAppPurchase
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-iap-receipt', {
      body: {
        receipt: purchase.transactionReceipt,
        productId: purchase.productId,
        transactionId: purchase.orderId,
      },
    });

    if (error) {
      captureError(error, { location: 'IAPService.verifyPurchaseOnServer' });
      return false;
    }

    return data?.success === true;
  } catch (error) {
    captureError(error, { location: 'IAPService.verifyPurchaseOnServer' });
    return false;
  }
}

/**
 * IAP が利用可能かどうかをチェック
 */
export function isIAPAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * 現在の購読状態を取得
 * （サーバー側の subscription_status を確認）
 */
export async function checkSubscriptionStatus(): Promise<{
  isSubscribed: boolean;
  expiresAt: string | null;
  platform: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isSubscribed: false, expiresAt: null, platform: null };
    }

    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_expires_at, subscription_platform')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return { isSubscribed: false, expiresAt: null, platform: null };
    }

    const isActive = data.subscription_status === 'active';
    const isNotExpired = !data.subscription_expires_at ||
      new Date(data.subscription_expires_at) > new Date();

    return {
      isSubscribed: isActive && isNotExpired,
      expiresAt: data.subscription_expires_at,
      platform: data.subscription_platform,
    };
  } catch (error) {
    captureError(error, { location: 'IAPService.checkSubscriptionStatus' });
    return { isSubscribed: false, expiresAt: null, platform: null };
  }
}
