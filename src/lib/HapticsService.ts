/**
 * HapticsService - Centralized haptic feedback management
 * Phase 4.5 - Advanced Animation Polish
 *
 * Provides unified haptic feedback with throttling and luxury presets.
 * "高級車の物理スイッチ" feel for premium interactions.
 */

import * as Haptics from 'expo-haptics';

// Throttle configuration
const DEFAULT_THROTTLE_MS = 50;

// Progressive feedback intervals (ms) - for sliders
const PROGRESSIVE_INTERVALS = {
  min: 80,  // at 0% progress
  max: 30,  // at 100% progress (faster taps = more urgent)
};

class HapticsServiceClass {
  private lastTriggerTime = 0;
  private progressiveLastTime = 0;

  /**
   * Check if enough time has passed since last haptic
   */
  private shouldTrigger(customThrottle?: number): boolean {
    const throttle = customThrottle ?? DEFAULT_THROTTLE_MS;
    const now = Date.now();
    if (now - this.lastTriggerTime < throttle) return false;
    this.lastTriggerTime = now;
    return true;
  }

  // ============================================
  // IMPACT FEEDBACK (Button presses)
  // ============================================

  /**
   * Light impact - subtle feedback for secondary actions
   * Use for: Secondary buttons, icon taps, selections
   */
  feedbackLight(): void {
    if (!this.shouldTrigger()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Medium impact - standard button feedback
   * Use for: Primary buttons, card presses, standard interactions
   */
  feedbackMedium(): void {
    if (!this.shouldTrigger()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  /**
   * Heavy impact - luxury car switch feel
   * Use for: Piano Black buttons, important confirmations
   * "高級車の物理スイッチのような重みのある振動"
   */
  feedbackHeavy(): void {
    if (!this.shouldTrigger()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  // ============================================
  // NOTIFICATION FEEDBACK (Outcomes)
  // ============================================

  /**
   * Success notification - positive completion
   * Use for: Task completion, verification success, achievements
   */
  feedbackSuccess(): void {
    if (!this.shouldTrigger()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  /**
   * Warning notification - caution/alert
   * Use for: Constraint violations, important warnings
   */
  feedbackWarning(): void {
    if (!this.shouldTrigger()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /**
   * Error notification - failure/error
   * Use for: Form errors, failures
   */
  feedbackError(): void {
    if (!this.shouldTrigger()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  // ============================================
  // SELECTION FEEDBACK (Pickers/Lists)
  // ============================================

  /**
   * Selection feedback - wheel picker / list selection
   * Use for: Wheel pickers, list item selection
   */
  feedbackSelection(): void {
    if (!this.shouldTrigger()) return;
    Haptics.selectionAsync();
  }

  // ============================================
  // PROGRESSIVE FEEDBACK (Sliders)
  // ============================================

  /**
   * Progressive feedback - escalating haptics for sliders
   * Interval decreases as progress increases (more urgent feel)
   *
   * @param progress - 0.0 to 1.0
   * @returns true if haptic was triggered
   */
  progressiveFeedback(progress: number): boolean {
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // Calculate dynamic interval (faster at higher progress)
    const interval =
      PROGRESSIVE_INTERVALS.min -
      (PROGRESSIVE_INTERVALS.min - PROGRESSIVE_INTERVALS.max) * clampedProgress;

    const now = Date.now();
    if (now - this.progressiveLastTime < interval) return false;
    this.progressiveLastTime = now;

    // Select intensity based on progress tier
    if (clampedProgress < 0.33) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (clampedProgress < 0.66) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    return true;
  }

  // ============================================
  // LUXURY PATTERNS (Compound feedback)
  // ============================================

  /**
   * Luxury confirm - double-tap pattern for important confirmations
   * Heavy + slight delay + Medium (like luxury door close)
   */
  luxuryConfirm(): void {
    if (!this.shouldTrigger(100)) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 80);
  }

  /**
   * Cinematic sequence - for dramatic reveals
   * Heavy at start, success at peak moment
   */
  cinematicSequence(phase: 'shutdown' | 'reveal' | 'glow'): void {
    switch (phase) {
      case 'shutdown':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'reveal':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'glow':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
    }
  }
}

// Singleton export
export const HapticsService = new HapticsServiceClass();
export default HapticsService;
