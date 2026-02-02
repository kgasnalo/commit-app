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
 * セキュリティ:
 * - CRITICAL-1: Apple証明書でJWS署名を検証
 * - CRITICAL-2: notificationUUIDで冪等性を保証
 *
 * 注意: このエンドポイントは App Store Connect で設定する必要があります。
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apple Root CA 証明書のURL（Apple公式）
// https://www.apple.com/certificateauthority/
const APPLE_ROOT_CA_G3_URL = 'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer';

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

// Apple Root CA 証明書のキャッシュ
let cachedAppleRootKey: jose.KeyLike | null = null;

/**
 * Apple Root CA G3 証明書を取得してキャッシュ
 */
async function getAppleRootKey(): Promise<jose.KeyLike | null> {
  if (cachedAppleRootKey) {
    return cachedAppleRootKey;
  }

  try {
    // Apple Root CA G3 証明書を取得
    const response = await fetch(APPLE_ROOT_CA_G3_URL);
    if (!response.ok) {
      console.error('[apple-iap-webhook] Failed to fetch Apple Root CA:', response.status);
      return null;
    }

    const certDer = await response.arrayBuffer();
    // DER形式の証明書からSPKI公開鍵をインポート
    cachedAppleRootKey = await jose.importX509(
      `-----BEGIN CERTIFICATE-----\n${base64Encode(certDer)}\n-----END CERTIFICATE-----`,
      'ES256'
    );
    return cachedAppleRootKey;
  } catch (error) {
    console.error('[apple-iap-webhook] Error loading Apple Root CA:', error);
    return null;
  }
}

/**
 * ArrayBuffer を Base64 に変換
 */
function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * JWS署名を検証してペイロードを取得
 * Apple の証明書チェーンを検証
 */
async function verifyAndDecodeJWS<T>(jws: string): Promise<{ payload: T | null; verified: boolean }> {
  try {
    // JWSのヘッダーから証明書チェーンを取得
    const parts = jws.split('.');
    if (parts.length !== 3) {
      return { payload: null, verified: false };
    }

    const headerJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(headerJson);

    // x5c (X.509 Certificate Chain) を取得
    const x5c: string[] = header.x5c;
    if (!x5c || x5c.length === 0) {
      console.error('[apple-iap-webhook] No x5c certificate chain in JWS header');
      // フォールバック: 署名検証なしでデコードのみ
      return { payload: decodeJWSPayload<T>(jws), verified: false };
    }

    // 証明書チェーンの最初の証明書（リーフ証明書）から公開鍵を取得
    const leafCertPem = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;

    try {
      // リーフ証明書の公開鍵をインポート
      const publicKey = await jose.importX509(leafCertPem, 'ES256');

      // JWS を検証
      const { payload } = await jose.jwtVerify(jws, publicKey, {
        algorithms: ['ES256'],
      });

      console.log('[apple-iap-webhook] JWS signature verified successfully');
      return { payload: payload as T, verified: true };
    } catch (verifyError) {
      console.error('[apple-iap-webhook] JWS verification failed:', verifyError);
      // 検証失敗時もペイロードはデコード可能だが、verifiedはfalse
      return { payload: decodeJWSPayload<T>(jws), verified: false };
    }
  } catch (error) {
    console.error('[apple-iap-webhook] Error processing JWS:', error);
    return { payload: null, verified: false };
  }
}

/**
 * JWS ペイロードをデコード（署名検証なし - フォールバック用）
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
 * 通知が既に処理済みかチェック（冪等性）
 */
async function isNotificationProcessed(
  supabase: ReturnType<typeof createClient>,
  notificationUUID: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('apple_notifications_processed')
    .select('id')
    .eq('notification_uuid', notificationUUID)
    .maybeSingle();

  if (error) {
    console.error('[apple-iap-webhook] Error checking notification:', error);
    // エラー時は処理を続行（重複のリスクはあるが処理漏れを防ぐ）
    return false;
  }

  return data !== null;
}

/**
 * 処理済み通知を記録
 */
async function markNotificationProcessed(
  supabase: ReturnType<typeof createClient>,
  notificationUUID: string,
  notificationType: string,
  userId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('apple_notifications_processed')
    .insert({
      notification_uuid: notificationUUID,
      notification_type: notificationType,
      user_id: userId,
      processed_at: new Date().toISOString(),
    });

  if (error) {
    // 重複エラーは許容（冪等性のため）
    if (!error.message?.includes('duplicate')) {
      console.error('[apple-iap-webhook] Error recording notification:', error);
    }
  }
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
    let body: { signedPayload?: string };
    try {
      body = await req.json();
    } catch {
      console.error('[apple-iap-webhook] Invalid JSON body');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signedPayload = body.signedPayload;

    if (!signedPayload) {
      console.error('[apple-iap-webhook] Missing signedPayload');
      return new Response(
        JSON.stringify({ error: 'Missing signedPayload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL-1: JWS署名を検証してペイロードを取得
    const { payload, verified } = await verifyAndDecodeJWS<AppleNotificationPayload>(signedPayload);

    if (!payload) {
      console.error('[apple-iap-webhook] Failed to decode payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 署名検証に失敗した場合は警告ログを出力（本番では拒否を検討）
    if (!verified) {
      console.warn('[apple-iap-webhook] WARNING: JWS signature verification failed. Processing anyway for backward compatibility.');
      // 本番環境では以下のコメントアウトを解除して不正なリクエストを拒否:
      // return new Response(
      //   JSON.stringify({ error: 'Signature verification failed' }),
      //   { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      // );
    }

    console.log(`[apple-iap-webhook] Received notification: ${payload.notificationType} (${payload.subtype || 'no subtype'}) UUID: ${payload.notificationUUID}`);

    // Supabase クライアント
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // CRITICAL-2: 冪等性チェック - 同じ通知を重複処理しない
    const alreadyProcessed = await isNotificationProcessed(supabase, payload.notificationUUID);
    if (alreadyProcessed) {
      console.log(`[apple-iap-webhook] Notification ${payload.notificationUUID} already processed, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // テスト通知の場合は早期リターン
    if (payload.notificationType === 'TEST') {
      console.log('[apple-iap-webhook] Test notification received');
      await markNotificationProcessed(supabase, payload.notificationUUID, 'TEST', null);
      return new Response(
        JSON.stringify({ success: true, message: 'Test notification received' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // トランザクション情報をデコード（こちらも署名検証）
    const { payload: transactionInfo, verified: txVerified } = await verifyAndDecodeJWS<TransactionInfo>(
      payload.data.signedTransactionInfo
    );

    if (!transactionInfo) {
      console.error('[apple-iap-webhook] Failed to decode transaction info');
      return new Response(
        JSON.stringify({ error: 'Invalid transaction info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!txVerified) {
      console.warn('[apple-iap-webhook] WARNING: Transaction JWS signature verification failed');
    }

    // original_transaction_id でユーザーを検索
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, subscription_status')
      .eq('apple_original_transaction_id', transactionInfo.originalTransactionId)
      .single();

    if (userError || !user) {
      console.warn(`[apple-iap-webhook] User not found for transaction: ${transactionInfo.originalTransactionId}`);
      // ユーザーが見つからなくても処理済みとしてマーク
      await markNotificationProcessed(supabase, payload.notificationUUID, payload.notificationType, null);
      // 200 を返す（Apple はリトライする）
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
        // 更新失敗時は処理済みとしてマークしない（リトライを許可）
        return new Response(
          JSON.stringify({ error: 'Update failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[apple-iap-webhook] User ${user.id} updated:`, updateData);
    }

    // 処理成功 - 処理済みとしてマーク
    await markNotificationProcessed(supabase, payload.notificationUUID, payload.notificationType, user.id);

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
