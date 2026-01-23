/**
 * OnboardingAtmosphereContext
 * Phase 2.0 - The Atmosphere
 *
 * Central context for managing the cinematic onboarding experience.
 * Handles Act transitions, color themes, toasts, and audio coordination.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import type {
  AtmosphereState,
  OnboardingAct,
  ReactiveToast,
  OnboardingAtmosphereContextType,
} from '../types/atmosphere.types';
import { getActForScreen, TIMING_CONFIGS } from '../config/animation';
import { SoundManager } from '../lib/audio';

// Create context with null default
const OnboardingAtmosphereContext =
  createContext<OnboardingAtmosphereContextType | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function OnboardingAtmosphereProvider({ children }: ProviderProps) {
  // Main atmosphere state
  const [state, setState] = useState<AtmosphereState>({
    currentAct: 'act1',
    currentScreen: 0,
    isTransitioning: false,
    audioEnabled: true,
  });

  // Active toasts
  const [activeToasts, setActiveToasts] = useState<ReactiveToast[]>([]);

  // Debounce ref to prevent rapid screen updates
  const lastUpdateRef = useRef<number>(0);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    SoundManager.initialize();

    return () => {
      // Cleanup on unmount
      SoundManager.cleanup();
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Update current screen and trigger Act transition if needed
   */
  const updateScreen = useCallback((screenIndex: number) => {
    const now = Date.now();

    // Debounce rapid updates (100ms minimum between updates)
    if (now - lastUpdateRef.current < 100) {
      return;
    }
    lastUpdateRef.current = now;

    const newAct = getActForScreen(screenIndex);

    setState((prev) => {
      // Check if Act is changing
      if (newAct !== prev.currentAct) {
        // Trigger audio crossfade if enabled
        if (prev.audioEnabled) {
          SoundManager.crossfadeToAct(newAct, TIMING_CONFIGS.actTransition.duration);
        }

        // Clear any existing transition timeout
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        // Set transition flag and schedule reset
        transitionTimeoutRef.current = setTimeout(() => {
          setState((s) => ({ ...s, isTransitioning: false }));
        }, TIMING_CONFIGS.actTransition.duration);

        return {
          ...prev,
          currentScreen: screenIndex,
          currentAct: newAct,
          isTransitioning: true,
        };
      }

      // Just update screen without Act change
      return { ...prev, currentScreen: screenIndex };
    });
  }, []);

  /**
   * Show a reactive toast
   */
  const showToast = useCallback((toast: Omit<ReactiveToast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? 2500;

    const newToast: ReactiveToast = {
      ...toast,
      id,
    };

    setActiveToasts((prev) => [...prev, newToast]);

    // Play toast sound
    SoundManager.playUISound('toast');

    // Auto-dismiss after duration
    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  /**
   * Hide a specific toast by ID
   */
  const hideToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Toggle audio enabled state
   */
  const setAudioEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, audioEnabled: enabled }));
    SoundManager.setMuted(!enabled);
  }, []);

  const contextValue = useMemo<OnboardingAtmosphereContextType>(() => ({
    state,
    updateScreen,
    showToast,
    hideToast,
    activeToasts,
    setAudioEnabled,
  }), [state, updateScreen, showToast, hideToast, activeToasts, setAudioEnabled]);

  return (
    <OnboardingAtmosphereContext.Provider value={contextValue}>
      {children}
    </OnboardingAtmosphereContext.Provider>
  );
}

/**
 * Hook to consume atmosphere context
 * @throws Error if used outside of OnboardingAtmosphereProvider
 */
export function useOnboardingAtmosphereContext(): OnboardingAtmosphereContextType {
  const context = useContext(OnboardingAtmosphereContext);

  if (!context) {
    throw new Error(
      'useOnboardingAtmosphereContext must be used within OnboardingAtmosphereProvider'
    );
  }

  return context;
}
