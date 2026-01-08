/**
 * useReactiveToast Hook
 * Phase 2.0.2 - The Reactive Toast System
 *
 * Hook for triggering reactive toasts based on user input.
 * Prevents duplicate toasts for the same trigger.
 */

import { useCallback, useRef } from 'react';
import { useOnboardingAtmosphere } from './useOnboardingAtmosphere';
import type { ToastTrigger, ToastType } from '../types/atmosphere.types';

interface UseReactiveToastReturn {
  /**
   * Check value against triggers and show toast if conditions are met.
   * Automatically prevents showing the same toast twice.
   */
  checkAndShowToast: (value: number | string, triggers: ToastTrigger[]) => void;

  /**
   * Reset shown toasts (e.g., when navigating away and back)
   */
  resetShownToasts: () => void;

  /**
   * Manually show a toast
   */
  showToast: (message: string, type: ToastType) => void;
}

export function useReactiveToast(): UseReactiveToastReturn {
  const { showToast: contextShowToast } = useOnboardingAtmosphere();

  // Track which toasts have been shown (by message key)
  const shownToastsRef = useRef<Set<string>>(new Set());

  /**
   * Check value against triggers and show matching toast
   */
  const checkAndShowToast = useCallback(
    (value: number | string, triggers: ToastTrigger[]) => {
      for (const trigger of triggers) {
        const toastKey = `${trigger.message}`;

        // Skip if already shown
        if (shownToastsRef.current.has(toastKey)) {
          continue;
        }

        // Check condition
        if (trigger.condition(value)) {
          contextShowToast({
            message: trigger.message,
            type: trigger.type,
          });
          shownToastsRef.current.add(toastKey);

          // Only show one toast at a time
          break;
        }
      }
    },
    [contextShowToast]
  );

  /**
   * Reset the shown toasts set
   */
  const resetShownToasts = useCallback(() => {
    shownToastsRef.current.clear();
  }, []);

  /**
   * Manually show a toast (bypasses trigger system)
   */
  const showToast = useCallback(
    (message: string, type: ToastType) => {
      contextShowToast({ message, type });
    },
    [contextShowToast]
  );

  return {
    checkAndShowToast,
    resetShownToasts,
    showToast,
  };
}
