import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { DeviceEventEmitter } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';
import { Database } from '../types/database.types';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth refresh event name
export const AUTH_REFRESH_EVENT = 'REFRESH_AUTH';

/**
 * Emit an event to trigger auth state refresh in AppNavigator.
 * Call this after manually updating subscription_status or other auth-related data.
 */
export function triggerAuthRefresh(): void {
  DeviceEventEmitter.emit(AUTH_REFRESH_EVENT);
}
