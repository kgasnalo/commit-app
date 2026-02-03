/**
 * verify-iap-receipt Edge Function
 *
 * Apple IAP のレシートを検証し、ユーザーの subscription_status を更新する。
 *
 * 処理フロー:
 * 1. クライアントからレシートを受け取る
 * 2. Apple App Store Server API でレシートを検証
 * 3. 有効な場合、users テーブルの subscription_status を 'active' に更新
 * 4. subscription_expires_at, subscription_platform, apple_original_transaction_id を保存
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apple App Store 環境
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

interface RequestBody {
  receipt: string;
  productId: string;
  transactionId?: string;
}

interface AppleVerifyResponse {
  status: number;
  environment?: string;
  receipt?: {
    in_app?: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date_ms: string;
      expires_date_ms?: string;
    }>;
    latest_receipt_info?: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date_ms: string;
      expires_date_ms?: string;
    }>;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date_ms: string;
    expires_date_ms?: string;
  }>;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 環境変数の検証
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appSharedSecret = Deno.env.get('APPLE_APP_SHARED_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[verify-iap-receipt] Missing Supabase credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'CONFIGURATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: APPLE_APP_SHARED_SECRETが未設定の場合、レシート検証は失敗する
    // この環境変数がないとIAP購入後にsubscription_statusが更新されず、アプリがフリーズする
    if (!appSharedSecret) {
      console.error('[verify-iap-receipt] CRITICAL: APPLE_APP_SHARED_SECRET is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'CONFIGURATION_ERROR', details: 'Apple shared secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase クライアント（ユーザー認証用）
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // ユーザー取得
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // リクエストボディの解析
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { receipt, productId, transactionId } = body;

    if (!receipt || !productId) {
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_FIELDS', details: 'receipt and productId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apple でレシートを検証
    const verificationResult = await verifyWithApple(receipt, appSharedSecret);

    if (!verificationResult.isValid) {
      console.error('[verify-iap-receipt] Apple verification failed:', verificationResult.error);
      return new Response(
        JSON.stringify({ success: false, error: 'RECEIPT_INVALID', details: verificationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // レシート情報から購入を検索
    const purchaseInfo = findPurchaseInReceipt(verificationResult.data, productId);

    if (!purchaseInfo) {
      return new Response(
        JSON.stringify({ success: false, error: 'PRODUCT_NOT_FOUND', details: 'Product not found in receipt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase Admin クライアント（DB更新用）
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ユーザーの subscription_status を更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_expires_at: purchaseInfo.expiresAt,
        subscription_platform: 'apple',
        apple_original_transaction_id: purchaseInfo.originalTransactionId,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[verify-iap-receipt] Failed to update user:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'UPDATE_FAILED', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-iap-receipt] User ${user.id} subscription activated. Product: ${productId}, Expires: ${purchaseInfo.expiresAt}`);

    return new Response(
      JSON.stringify({
        success: true,
        productId,
        expiresAt: purchaseInfo.expiresAt,
        originalTransactionId: purchaseInfo.originalTransactionId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-iap-receipt] Unhandled error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Apple API呼び出しタイムアウト（10秒）
const APPLE_API_TIMEOUT_MS = 10000;

/**
 * Apple のサーバーでレシートを検証
 */
async function verifyWithApple(
  receipt: string,
  appSharedSecret?: string
): Promise<{ isValid: boolean; data?: AppleVerifyResponse; error?: string }> {
  const requestBody: { 'receipt-data': string; password?: string; 'exclude-old-transactions'?: boolean } = {
    'receipt-data': receipt,
    'exclude-old-transactions': true,
  };

  if (appSharedSecret) {
    requestBody.password = appSharedSecret;
  }

  // タイムアウト付きfetch用ヘルパー
  const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APPLE_API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    // まず本番環境で検証
    let response = await fetchWithTimeout(APPLE_PRODUCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    let result: AppleVerifyResponse = await response.json();

    // status 21007 はサンドボックスレシートを本番環境に送った場合
    // サンドボックス環境で再検証
    if (result.status === 21007) {
      response = await fetchWithTimeout(APPLE_SANDBOX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      result = await response.json();
    }

    // status 0 は成功
    if (result.status === 0) {
      return { isValid: true, data: result };
    }

    // エラーコードの説明
    const errorMessages: Record<number, string> = {
      21000: 'The request to the App Store was not made using the HTTP POST request method.',
      21001: 'This status code is no longer sent by the App Store.',
      21002: 'The data in the receipt-data property was malformed or the service experienced a temporary issue.',
      21003: 'The receipt could not be authenticated.',
      21004: 'The shared secret you provided does not match the shared secret on file for your account.',
      21005: 'The receipt server was temporarily unable to provide the receipt.',
      21006: 'This receipt is valid but the subscription has expired.',
      21007: 'This receipt is from the test environment.',
      21008: 'This receipt is from the production environment.',
      21010: 'This receipt could not be authorized.',
    };

    return {
      isValid: false,
      error: errorMessages[result.status] || `Unknown error: ${result.status}`,
    };
  } catch (error) {
    // タイムアウトまたはネットワークエラー
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[verify-iap-receipt] Apple API request timed out');
      return { isValid: false, error: 'Apple API request timed out' };
    }
    console.error('[verify-iap-receipt] Apple API request failed:', error);
    return { isValid: false, error: `Apple API request failed: ${error}` };
  }
}

/**
 * レシートから指定された商品の購入情報を検索
 * 複数の購入がある場合、最新の有効期限を持つものを返す
 */
function findPurchaseInReceipt(
  appleResponse: AppleVerifyResponse,
  productId: string
): { expiresAt: string | null; originalTransactionId: string } | null {
  // latest_receipt_info を優先（サブスクリプションの最新状態が含まれる）
  const purchases =
    appleResponse.latest_receipt_info ||
    appleResponse.receipt?.latest_receipt_info ||
    appleResponse.receipt?.in_app ||
    [];

  // 指定された productId の購入をすべて取得
  const matchingPurchases = purchases.filter((p) => p.product_id === productId);

  if (matchingPurchases.length === 0) {
    return null;
  }

  // 最新の有効期限を持つ購入を検索（複数購入対応）
  // reduce で最新の expires_date_ms を持つエントリを選択
  const latestPurchase = matchingPurchases.reduce((latest, current) => {
    const currentExpires = parseInt(current.expires_date_ms || '0', 10);
    const latestExpires = parseInt(latest.expires_date_ms || '0', 10);
    return currentExpires > latestExpires ? current : latest;
  });

  // 有効期限の計算
  let expiresAt: string | null = null;
  if (latestPurchase.expires_date_ms) {
    expiresAt = new Date(parseInt(latestPurchase.expires_date_ms, 10)).toISOString();
  }

  return {
    expiresAt,
    originalTransactionId: latestPurchase.original_transaction_id,
  };
}
