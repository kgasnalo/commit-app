/**
 * Global Animation Configuration
 * Phase 2.0.3 - Animation & Audio Config
 */

import { Easing } from 'react-native-reanimated';
import type { OnboardingAct, ActColorTheme } from '../types/atmosphere.types';

// ============================================
// SPRING CONFIGURATIONS (physics-based)
// ============================================
export const SPRING_CONFIGS = {
  // Snappy, responsive - for buttons, small elements
  snappy: { damping: 15, stiffness: 300, mass: 1 },

  // Smooth, elegant - for page transitions, modals
  smooth: { damping: 20, stiffness: 150, mass: 1 },

  // Bouncy, playful - for celebrations, achievements
  bouncy: { damping: 10, stiffness: 200, mass: 0.8 },

  // Heavy, dramatic - for penalty amounts, warnings
  heavy: { damping: 25, stiffness: 100, mass: 1.5 },
} as const;

// ============================================
// TIMING CONFIGURATIONS
// ============================================
export const TIMING_CONFIGS = {
  // Quick micro-interactions (50-150ms)
  instant: { duration: 100, easing: Easing.out(Easing.quad) },

  // Standard transitions (200-300ms)
  standard: { duration: 250, easing: Easing.inOut(Easing.quad) },

  // Slow, cinematic (400-600ms)
  cinematic: { duration: 500, easing: Easing.inOut(Easing.cubic) },

  // Act transition (1000ms) - per ROADMAP spec
  actTransition: { duration: 1000, easing: Easing.inOut(Easing.cubic) },
} as const;

// ============================================
// AMBIENT TIMING CONFIGURATIONS
// Phase 4.5 - "Incandescent bulb" slow fade effect
// ============================================
export const AMBIENT_TIMING_CONFIGS = {
  // "白熱電球" - warm, slow fade like an incandescent bulb warming up
  incandescent: { duration: 700, easing: Easing.out(Easing.sin) },

  // Subtle glow pulse on animation settle
  glowPulse: { duration: 400, easing: Easing.inOut(Easing.quad) },

  // Modal appearance - slower than standard
  modalAmbient: { duration: 600, easing: Easing.out(Easing.cubic) },

  // List item stagger timing
  staggerBase: { duration: 500, easing: Easing.out(Easing.quad) },
  staggerDelay: 80, // ms between items
} as const;

// ============================================
// EASING CURVES
// ============================================
export const EASING_CURVES = {
  // Organic movement for orbs
  organic: Easing.inOut(Easing.sin),

  // Sharp deceleration for UI elements
  decelerate: Easing.out(Easing.cubic),

  // Accelerate then decelerate
  smooth: Easing.inOut(Easing.quad),

  // Bounce effect
  bounce: Easing.bounce,
} as const;

// ============================================
// HAPTIC PATTERNS
// ============================================
export const HAPTIC_PATTERNS = {
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  selection: 'selectionChanged',
} as const;

// ============================================
// ACT COLOR THEMES
// ============================================
export const ACT_THEMES: Record<OnboardingAct, ActColorTheme> = {
  // Act 1 (Screens 0-4): Cool Blue/Purple - Calm, Intellectual
  act1: {
    primary: '#0A0A1A',
    secondary: '#0F0F2A',
    accent: '#4A6FA5',
    orbColors: ['#4A6FA5', '#7B68EE', '#6A5ACD', '#483D8B'],
  },

  // Act 2 (Screens 5-10): Deep Red/Black - Warning, Anxiety
  act2: {
    primary: '#0A0A0A',
    secondary: '#1A0A0A',
    accent: '#8B0000',
    orbColors: ['#8B0000', '#DC143C', '#800000', '#4A0000'],
  },

  // Act 3 (Screens 11-13): Bright Gold/White - Hope, Achievement
  act3: {
    primary: '#0A0A0A',
    secondary: '#1A1A0A',
    accent: '#FFD700',
    orbColors: ['#FFD700', '#FFA500', '#FFFACD', '#F4E04D'],
  },
};

// ============================================
// ORB ANIMATION SETTINGS
// ============================================
export const ORB_CONFIG = {
  count: 4,
  minRadius: 80,
  maxRadius: 200,
  blurAmount: 40,
  // Movement settings
  movementDuration: { min: 8000, max: 15000 }, // ms per cycle
  movementAmplitude: { min: 50, max: 150 },    // pixels
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the Act for a given screen index
 * @param screenIndex - Current onboarding screen (0-13)
 */
export function getActForScreen(screenIndex: number): OnboardingAct {
  if (screenIndex <= 4) return 'act1';
  if (screenIndex <= 10) return 'act2';
  return 'act3';
}

/**
 * Get the color theme for a given screen index
 */
export function getThemeForScreen(screenIndex: number): ActColorTheme {
  const act = getActForScreen(screenIndex);
  return ACT_THEMES[act];
}

/**
 * Generate random orb configuration
 */
export function generateOrbConfigs(
  screenWidth: number,
  screenHeight: number,
  colors: string[]
): Array<{
  initialX: number;
  initialY: number;
  radius: number;
  color: string;
  duration: number;
  amplitude: number;
}> {
  return colors.map((color, index) => {
    const { minRadius, maxRadius, movementDuration, movementAmplitude } = ORB_CONFIG;

    return {
      initialX: Math.random() * screenWidth,
      initialY: Math.random() * screenHeight,
      radius: minRadius + Math.random() * (maxRadius - minRadius),
      color,
      duration:
        movementDuration.min +
        Math.random() * (movementDuration.max - movementDuration.min),
      amplitude:
        movementAmplitude.min +
        Math.random() * (movementAmplitude.max - movementAmplitude.min),
    };
  });
}
