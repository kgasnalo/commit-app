import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-react-native';
import { POSTHOG_API_KEY } from '../config/env';
import { setAnalyticsInstance } from '../lib/AnalyticsService';

// ============================================
// Types
// ============================================

// PostHog compatible property types
type JsonType = string | number | boolean | null | { [key: string]: JsonType } | JsonType[];
type AnalyticsProperties = Record<string, JsonType>;

interface AnalyticsContextType {
  isReady: boolean;
  identify: (userId: string, properties?: AnalyticsProperties) => void;
  reset: () => void;
  trackEvent: (eventName: string, properties?: AnalyticsProperties) => void;
  isFeatureEnabled: (flagKey: string) => boolean | undefined;
  getFeatureFlagPayload: (flagKey: string) => JsonType;
}

// ============================================
// Context
// ============================================

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

/**
 * Hook to access analytics functions.
 * Must be used within AnalyticsProvider.
 */
export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}

// ============================================
// Internal Provider (with PostHog access)
// ============================================

function AnalyticsContextProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (posthog) {
      setAnalyticsInstance(posthog);
      setIsReady(true);
    }
    return () => {
      setAnalyticsInstance(null);
    };
  }, [posthog]);

  const identify = useCallback((userId: string, properties?: AnalyticsProperties) => {
    if (posthog) {
      posthog.identify(userId, properties);
    }
    if (__DEV__) {
      console.log('[Analytics] identify:', userId, properties);
    }
  }, [posthog]);

  const reset = useCallback(() => {
    if (posthog) {
      posthog.reset();
    }
    if (__DEV__) {
      console.log('[Analytics] reset');
    }
  }, [posthog]);

  const trackEvent = useCallback((eventName: string, properties?: AnalyticsProperties) => {
    if (posthog) {
      posthog.capture(eventName, properties);
    }
    if (__DEV__) {
      console.log(`[Analytics] ${eventName}`, properties);
    }
  }, [posthog]);

  const isFeatureEnabled = useCallback((flagKey: string): boolean | undefined => {
    return posthog?.isFeatureEnabled(flagKey);
  }, [posthog]);

  const getFeatureFlagPayload = useCallback((flagKey: string): JsonType => {
    return posthog?.getFeatureFlagPayload(flagKey) as JsonType;
  }, [posthog]);

  return (
    <AnalyticsContext.Provider
      value={{
        isReady,
        identify,
        reset,
        trackEvent,
        isFeatureEnabled,
        getFeatureFlagPayload,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

// ============================================
// Disabled Provider (fallback when no API key)
// ============================================

function DisabledAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const noopIdentify = useCallback((userId: string, properties?: AnalyticsProperties) => {
    if (__DEV__) {
      console.log('[Analytics-disabled] identify:', userId, properties);
    }
  }, []);

  const noopReset = useCallback(() => {
    if (__DEV__) {
      console.log('[Analytics-disabled] reset');
    }
  }, []);

  const noopTrackEvent = useCallback((eventName: string, properties?: AnalyticsProperties) => {
    if (__DEV__) {
      console.log(`[Analytics-disabled] ${eventName}`, properties);
    }
  }, []);

  const noopIsFeatureEnabled = useCallback((): boolean | undefined => {
    return undefined;
  }, []);

  const noopGetFeatureFlagPayload = useCallback((): JsonType => {
    return null;
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        isReady: false,
        identify: noopIdentify,
        reset: noopReset,
        trackEvent: noopTrackEvent,
        isFeatureEnabled: noopIsFeatureEnabled,
        getFeatureFlagPayload: noopGetFeatureFlagPayload,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

// ============================================
// Main Provider Export
// ============================================

/**
 * AnalyticsProvider - Wraps app with PostHog analytics.
 * Features: Event tracking, Feature Flags, Session Replay, A/B Testing
 *
 * Usage:
 * ```tsx
 * <AnalyticsProvider>
 *   <App />
 * </AnalyticsProvider>
 * ```
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Skip PostHog if API key not configured
  if (!POSTHOG_API_KEY) {
    if (__DEV__) {
      console.warn('[Analytics] PostHog API key not configured, analytics disabled');
    }
    return <DisabledAnalyticsProvider>{children}</DisabledAnalyticsProvider>;
  }

  return (
    <PHProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: 'https://us.i.posthog.com',
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: true,
          maskAllImages: false,
          captureLog: true,
          captureNetworkTelemetry: true,
        },
        // Disable in development to avoid noise
        disabled: __DEV__,
      }}
      autocapture={{
        // DISABLED: PostHog's auto screen capture uses useNavigationState internally,
        // which causes errors when called before NavigationContainer is ready.
        // Screen tracking is done manually in NavigationContent instead.
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <AnalyticsContextProvider>{children}</AnalyticsContextProvider>
    </PHProvider>
  );
}
