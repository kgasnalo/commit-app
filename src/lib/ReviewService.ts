/**
 * ReviewService - Smart App Store review prompts
 * Phase 4.8 - Review & Rating Strategy
 *
 * Handles:
 * - Requesting App Store reviews at optimal moments
 * - Cooldown management (3 months between prompts)
 * - Device compatibility checking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
  LAST_REVIEW_DATE: 'review_last_requested_date',
};

const REVIEW_COOLDOWN_DAYS = 90; // 3 months between prompts

// ============================================
// Service Class
// ============================================

class ReviewServiceClass {
  /**
   * Attempt to request an App Store review
   * Only prompts if:
   * 1. Device supports reviews
   * 2. User hasn't been prompted in last 3 months
   */
  async attemptReviewRequest(): Promise<boolean> {
    try {
      // Check if device supports review requests
      const hasAction = await StoreReview.hasAction();
      if (!hasAction) {
        console.log('[ReviewService] Device does not support review requests');
        return false;
      }

      // Check cooldown period
      const lastReviewDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_REVIEW_DATE);
      if (lastReviewDate) {
        const lastDate = new Date(lastReviewDate);
        const now = new Date();
        const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSince < REVIEW_COOLDOWN_DAYS) {
          console.log(`[ReviewService] Cooldown active (${Math.floor(daysSince)}/${REVIEW_COOLDOWN_DAYS} days)`);
          return false;
        }
      }

      // Request review
      await StoreReview.requestReview();

      // Save request date
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_REVIEW_DATE,
        new Date().toISOString()
      );

      console.log('[ReviewService] Review requested successfully');
      return true;
    } catch (error) {
      // Silently fail - never interrupt user flow
      console.warn('[ReviewService] Failed to request review:', error);
      return false;
    }
  }

  /**
   * Check if review can be requested (for debugging/analytics)
   */
  async canRequestReview(): Promise<{ canRequest: boolean; reason?: string }> {
    try {
      const hasAction = await StoreReview.hasAction();
      if (!hasAction) {
        return { canRequest: false, reason: 'not_supported' };
      }

      const lastReviewDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_REVIEW_DATE);
      if (lastReviewDate) {
        const lastDate = new Date(lastReviewDate);
        const now = new Date();
        const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSince < REVIEW_COOLDOWN_DAYS) {
          return {
            canRequest: false,
            reason: `cooldown_${Math.floor(REVIEW_COOLDOWN_DAYS - daysSince)}_days_remaining`,
          };
        }
      }

      return { canRequest: true };
    } catch (error) {
      return { canRequest: false, reason: 'error' };
    }
  }

  /**
   * Reset review history (for testing only)
   */
  async resetReviewHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_REVIEW_DATE);
    console.log('[ReviewService] Review history cleared');
  }
}

// ============================================
// Singleton Export
// ============================================

export const ReviewService = new ReviewServiceClass();
export default ReviewService;
