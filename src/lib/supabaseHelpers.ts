/**
 * Supabase Edge Functions helpers with retry logic for WORKER_ERROR handling.
 *
 * Supabase Edge Functions (Deno Deploy) may return WORKER_ERROR during cold starts.
 * This utility provides automatic retry with exponential backoff.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Invoke a Supabase Edge Function with automatic retry on WORKER_ERROR.
 *
 * @param functionName - Name of the Edge Function to invoke
 * @param body - Request body to send
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise with data or error
 *
 * @example
 * const { data, error } = await invokeFunctionWithRetry<{ success: boolean }>(
 *   'create-commitment',
 *   { book_title, deadline, pledge_amount }
 * );
 */
export async function invokeFunctionWithRetry<T>(
  functionName: string,
  body: object,
  maxRetries = 3
): Promise<{ data: T | null; error: Error | null }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.functions.invoke<T>(functionName, { body });

    if (!error) {
      return { data, error: null };
    }

    // WORKER_ERROR の場合のみリトライ
    if (error instanceof FunctionsHttpError) {
      try {
        const errorBody = await error.context.json();
        if (
          (errorBody.code === 'WORKER_ERROR' || errorBody.message?.includes('WORKER_ERROR')) &&
          attempt < maxRetries
        ) {
          if (__DEV__) {
            console.log(`[${functionName}] Retry ${attempt}/${maxRetries} after WORKER_ERROR`);
          }
          // Exponential backoff: 1s, 2s, 3s...
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
      } catch {
        // JSON parse failed, don't retry
      }
    }

    return { data: null, error };
  }

  return { data: null, error: new Error('Max retries exceeded') };
}
