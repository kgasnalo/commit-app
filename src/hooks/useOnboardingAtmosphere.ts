/**
 * useOnboardingAtmosphere Hook
 * Phase 2.0 - The Atmosphere
 *
 * Convenient hook for consuming the OnboardingAtmosphere context
 * with additional derived values and helpers.
 */

import { useMemo } from 'react';
import { useOnboardingAtmosphereContext } from '../context/OnboardingAtmosphereContext';
import { ACT_THEMES, getActForScreen } from '../config/animation';
import type { ActColorTheme, OnboardingAct } from '../types/atmosphere.types';

interface UseOnboardingAtmosphereReturn {
  // State
  currentAct: OnboardingAct;
  currentScreen: number;
  isTransitioning: boolean;
  audioEnabled: boolean;

  // Derived values
  currentTheme: ActColorTheme;

  // Toasts
  activeToasts: ReturnType<typeof useOnboardingAtmosphereContext>['activeToasts'];

  // Actions
  updateScreen: (screenIndex: number) => void;
  showToast: ReturnType<typeof useOnboardingAtmosphereContext>['showToast'];
  hideToast: (id: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export function useOnboardingAtmosphere(): UseOnboardingAtmosphereReturn {
  const context = useOnboardingAtmosphereContext();

  // Derive current theme from Act
  const currentTheme = useMemo(() => {
    return ACT_THEMES[context.state.currentAct];
  }, [context.state.currentAct]);

  return {
    // State
    currentAct: context.state.currentAct,
    currentScreen: context.state.currentScreen,
    isTransitioning: context.state.isTransitioning,
    audioEnabled: context.state.audioEnabled,

    // Derived
    currentTheme,

    // Toasts
    activeToasts: context.activeToasts,

    // Actions
    updateScreen: context.updateScreen,
    showToast: context.showToast,
    hideToast: context.hideToast,
    setAudioEnabled: context.setAudioEnabled,
  };
}

/**
 * Get theme for a specific screen (for pre-calculating colors)
 */
export function getScreenTheme(screenIndex: number): ActColorTheme {
  const act = getActForScreen(screenIndex);
  return ACT_THEMES[act];
}
