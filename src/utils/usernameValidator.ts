import { supabase } from '../lib/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

interface ValidationResult {
  isValid: boolean;
  errorKey?: string;
}

/**
 * Validates username format synchronously (no DB call).
 * Returns an i18n error key if invalid.
 */
export function validateUsernameFormat(username: string): ValidationResult {
  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { isValid: false, errorKey: 'errors.username.too_short' };
  }

  if (trimmed.length < MIN_LENGTH) {
    return { isValid: false, errorKey: 'errors.username.too_short' };
  }

  if (trimmed.length > MAX_LENGTH) {
    return { isValid: false, errorKey: 'errors.username.too_long' };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return { isValid: false, errorKey: 'errors.username.invalid_characters' };
  }

  return { isValid: true };
}

/**
 * Checks username availability via Supabase RPC.
 * Optionally excludes the current user's own username.
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase.rpc('check_username_available', {
      p_username: username.trim(),
      p_exclude_user_id: excludeUserId ?? null,
    });

    if (error) {
      console.error('Username availability check error:', error);
      return { isValid: false, errorKey: 'errors.username.check_failed' };
    }

    if (data === false) {
      return { isValid: false, errorKey: 'errors.username.taken' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Username availability check exception:', error);
    return { isValid: false, errorKey: 'errors.username.check_failed' };
  }
}
