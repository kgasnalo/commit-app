/**
 * apple-iap-webhook Edge Function
 *
 * Apple App Store Server Notifications V2 を受信し、
 * ユーザーの subscription_status を更新する。
 *
 * 対応イベント:
 * - SUBSCRIBED: 新規購読
 * - DID_RENEW: 自動更新成功
 * - DID_CHANGE_RENEWAL_STATUS: 自動更新設定変更
 * - EXPIRED: 購読期限切れ
 * - DID_FAIL_TO_RENEW: 更新失敗
 * - REFUND: 返金
 * - GRACE_PERIOD_EXPIRED: 猶予期間終了
 *
 * 注意: このエンドポイントは App Store Connect で設定する必要があります。
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apple の通知タイプ
type NotificationType =
  | 'SUBSCRIBED'
  | 'DID_RENEW'
  | 'DID_CHANGE_RENEWAL_STATUS'
  | 'DID_CHANGE_RENEWAL_PREF'
  | 'DID_FAIL_TO_RENEW'
  | 'EXPIRED'
  | 'GRACE_PERIOD_EXPIRED'
  | 'OFFER_REDEEMED'
  | 'PRICE_INCREASE'
  | 'REFUND'
  | 'REFUND_DECLINED'
  | 'REFUND_REVERSED'
  | 'RENEWAL_EXTENDED'
  | 'RENEWAL_EXTENSION'
  | 'REVOKE'
  | 'TEST'
  | 'CONSUMPTION_REQUEST'
  | 'ONE_TIME_CHARGE';

// サブタイプ
type SubType =
  | 'INITIAL_BUY'
  | 'RESUBSCRIBE'
  | 'DOWNGRADE'
  | 'UPGRADE'
  | 'AUTO_RENEW_ENABLED'
  | 'AUTO_RENEW_DISABLED'
  | 'VOLUNTARY'
  | 'BILLING_RETRY'
  | 'PRICE_INCREASE'
  | 'GRACE_PERIOD'
  | 'PENDING'
  | 'ACCEPTED'
  | 'BILLING_RECOVERY'
  | 'PRODUCT_NOT_FOR_SALE'
  | 'SUMMARY'
  | 'FAILURE';

interface AppleNotificationPayload {
  notificationType: NotificationType;
  subtype?: SubType;
  notificationUUID: string;
  data: {
    appAppleId: number;
    bundleId: string;
    bundleVersion: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo: string;
    signedRenewalInfo?: string;
  };
  version: string;
  signedDate: number;
}

interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  quantity: number;
  type: string;
  appAccountToken?: string;
  inAppOwnershipType: string;
  signedDate: number;
  environment: string;
  transactionReason?: string;
  storefront?: string;
  storefrontId?: string;
  price?: number;
  currency?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST のみ受け付け
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 環境変数の検証
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[apple-iap-webhook] Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // リクエストボディを取得
    const body = await req.json();
    const signedPayload = body.signedPayload;

    if (!signedPayload) {
      console.error('[apple-iap-webhook] Missing signedPayload');
      return new Response(
        JSON.stringify({ error: 'Missing signedPayload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JWS を検証してペイロードを取得
    // 注意: 本番環境では Apple の証明書を使用して署名を検証すべき
    // ここでは簡略化のためペイロードのみをデコード
    const payload = decodeJWSPayload<AppleNotificationPayload>(signedPayload);

    if (!payload) {
      console.error('[apple-iap-webhook] Failed to decode payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[apple-iap-webhook] Received notification: ${payload.notificationType} (${payload.subtype || 'no subtype'})`);

    // テスト通知の場合は早期リターン
    if (payload.notificationType === 'TEST') {
      console.log('[apple-iap-webhook] Test notification received');
      return new Response(
        JSON.stringify({ success: true, message: 'Test notification received' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // トランザクション情報をデコード
    const transactionInfo = decodeJWSPayload<TransactionInfo>(payload.data.signedTransactionInfo);

    if (!transactionInfo) {
      console.error('[apple-iap-webhook] Failed to decode transaction info');
      return new Response(
        JSON.stringify({ error: 'Invalid transaction info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase クライアント
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // original_transaction_id でユーザーを検索
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, subscription_status')
      .eq('apple_original_transaction_id', transactionInfo.originalTransactionId)
      .single();

    if (userError || !user) {
      console.warn(`[apple-iap-webhook] User not found for transaction: ${transactionInfo.originalTransactionId}`);
      // ユーザーが見つからなくても 200 を返す（Apple はリトライする）
      return new Response(
        JSON.stringify({ success: true, message: 'User not found, notification acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 通知タイプに応じて処理
    const updateData = processNotification(payload.notificationType, payload.subtype, transactionInfo);

    if (updateData) {
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.error(`[apple-iap-webhook] Failed to update user ${user.id}:`, updateError);
        return new Response(
          JSON.stringify({ error: 'Update failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[apple-iap-webhook] User ${user.id} updated:`, updateData);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[apple-iap-webhook] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * JWS ペイロードをデコード（署名検証なし）
 * 本番環境では Apple の証明書で署名を検証すべき
 */
function decodeJWSPayload<T>(jws: string): T | null {
  try {
    const parts = jws.split('.');
    if (parts.length !== 3) return null;

    const payloadBase64 = parts[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

/**
 * 通知タイプに応じた更新データを生成
 */
function processNotification(
  notificationType: NotificationType,
  subtype: SubType | undefined,
  transactionInfo: TransactionInfo
): Record<string, unknown> | null {
  const expiresAt = transactionInfo.expiresDate
    ? new Date(transactionInfo.expiresDate).toISOString()
    : null;

  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'OFFER_REDEEMED':
      // 購読開始・更新 → active
      return {
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
      };

    case 'DID_CHANGE_RENEWAL_STATUS':
      // 自動更新設定が変更された
      if (subtype === 'AUTO_RENEW_DISABLED') {
        // 解約予約（次回更新で終了）
        // ただし、まだ有効期限内なので status は変更しない
        console.log(`[apple-iap-webhook] Auto-renew disabled for user. Expires at: ${expiresAt}`);
        return null;
      }
      return null;

    case 'EXPIRED':
    case 'GRACE_PERIOD_EXPIRED':
      // 購読期限切れ → inactive
      return {
        subscription_status: 'inactive',
        subscription_expires_at: expiresAt,
      };

    case 'DID_FAIL_TO_RENEW':
      // 更新失敗 - 猶予期間中の場合がある
      if (subtype === 'GRACE_PERIOD') {
        // 猶予期間中は active のまま
        console.log('[apple-iap-webhook] In grace period');
        return null;
      }
      // 猶予期間でなければ inactive
      return {
        subscription_status: 'inactive',
        subscription_expires_at: expiresAt,
      };

    case 'REFUND':
    case 'REVOKE':
      // 返金・取り消し → inactive
      return {
        subscription_status: 'inactive',
        subscription_expires_at: new Date().toISOString(),
      };

    default:
      console.log(`[apple-iap-webhook] Unhandled notification type: ${notificationType}`);
      return null;
  }
}
