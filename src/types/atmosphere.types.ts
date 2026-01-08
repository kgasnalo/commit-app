/**
 * Atmosphere Types for Cinematic Onboarding
 * Phase 2.0 - The Atmosphere
 */

// Onboarding Acts (3-act structure)
export type OnboardingAct = 'act1' | 'act2' | 'act3';

// Color theme for each Act
export interface ActColorTheme {
  primary: string;      // Main background color
  secondary: string;    // Secondary background
  accent: string;       // Accent highlights
  orbColors: string[];  // Colors for animated orbs (4 colors)
}

// Individual orb configuration
export interface OrbConfig {
  id: string;
  initialX: number;
  initialY: number;
  radius: number;
  color: string;
  speed: number;       // Animation speed multiplier
  amplitude: number;   // Movement amplitude
}

// Global atmosphere state
export interface AtmosphereState {
  currentAct: OnboardingAct;
  currentScreen: number;
  isTransitioning: boolean;
  audioEnabled: boolean;
}

// Toast types
export type ToastType = 'encouragement' | 'warning' | 'celebration';

// Reactive toast message
export interface ReactiveToast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;  // Default: 2500ms
}

// Toast trigger configuration
export interface ToastTrigger {
  condition: (value: number | string) => boolean;
  message: string;
  type: ToastType;
}

// Context type for atmosphere provider
export interface OnboardingAtmosphereContextType {
  state: AtmosphereState;
  updateScreen: (screenIndex: number) => void;
  showToast: (toast: Omit<ReactiveToast, 'id'>) => void;
  hideToast: (id: string) => void;
  activeToasts: ReactiveToast[];
  setAudioEnabled: (enabled: boolean) => void;
}
