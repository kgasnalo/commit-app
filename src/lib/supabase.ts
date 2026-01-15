import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session } from '@supabase/supabase-js';
import { DeviceEventEmitter } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';
import { Database } from '../types/database.types';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth refresh event name
export const AUTH_REFRESH_EVENT = 'REFRESH_AUTH';

/**
 * Emit an event to trigger auth state refresh in AppNavigator.
 * Call this after manually updating subscription_status or other auth-related data.
 */
export function triggerAuthRefresh(): void {
  DeviceEventEmitter.emit(AUTH_REFRESH_EVENT);
}

/**
 * OAuth完了後にセッションが利用可能になるまで待機するヘルパー関数。
 * AsyncStorage への永続化が完了するまでの間、ポーリングでセッションを確認する。
 *
 * @param timeoutMs - 最大待機時間（デフォルト: 5000ms）
 * @param intervalMs - チェック間隔（デフォルト: 200ms）
 * @returns セッションオブジェクト、またはタイムアウト時は null
 */
export async function waitForSession(
  timeoutMs: number = 5000,
  intervalMs: number = 200
): Promise<Session | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log(`[waitForSession] Session available after ${Date.now() - startTime}ms`);
      return session;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  console.warn(`[waitForSession] Timeout after ${timeoutMs}ms`);
  return null;
}
