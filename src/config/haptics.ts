/**
 * Haptic Feedback Configuration
 * Phase 4.5 - Advanced Animation Polish
 *
 * Centralized constants for haptic patterns.
 */

// Button press scale animations paired with haptics
export const HAPTIC_BUTTON_SCALES = {
  // Piano Black buttons - luxury car switch feel
  heavy: {
    pressed: 0.97,
    spring: { damping: 15, stiffness: 300 },
  },
  // Standard buttons
  medium: {
    pressed: 0.97,
    spring: { damping: 15, stiffness: 300 },
  },
  // Light/secondary buttons
  light: {
    pressed: 0.98,
    spring: { damping: 15, stiffness: 300 },
  },
} as const;

// Throttle intervals
export const HAPTIC_THROTTLE = {
  default: 50, // ms - standard anti-spam
  luxury: 100, // ms - for compound patterns
} as const;

// Progressive feedback intervals (for sliders)
export const HAPTIC_PROGRESSIVE = {
  minInterval: 80, // ms at 0% progress
  maxInterval: 30, // ms at 100% progress
  tiers: {
    light: 0.33,   // 0-33% = light
    medium: 0.66,  // 33-66% = medium
    heavy: 1.0,    // 66-100% = heavy
  },
} as const;

// Haptic pattern names (for documentation/debugging)
export const HAPTIC_PATTERNS = {
  // Button feedback
  buttonLight: 'impactLight',
  buttonMedium: 'impactMedium',
  buttonHeavy: 'impactHeavy',
  // Notifications
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
  // Selection
  selection: 'selectionChanged',
  // Compound
  luxuryConfirm: 'heavy + delay + medium',
} as const;
