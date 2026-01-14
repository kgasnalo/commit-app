/**
 * RemoteConfigService - Feature flag based blocking logic
 * Phase 8.4-8.5 - Remote Config & Force Update
 *
 * Uses PostHog Feature Flags to control:
 * - maintenance_mode: boolean - Show maintenance screen
 * - min_app_version: string - Force update if current version is lower
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { useAnalytics } from '../contexts/AnalyticsContext';

// App Store URLs (iOS ID to be updated after App Store submission)
const STORE_URLS = {
  ios: 'https://apps.apple.com/app/commit-app/id6743942761',
  android: 'https://play.google.com/store/apps/details?id=com.kgxxx.commitapp',
};

export type BlockingStatus =
  | { isBlocked: false }
  | { isBlocked: true; reason: 'maintenance' }
  | { isBlocked: true; reason: 'update_required'; storeUrl: string };

/**
 * Compare two semantic version strings
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = b.split('.').map((n) => parseInt(n, 10) || 0);

  // Pad arrays to same length
  const maxLen = Math.max(partsA.length, partsB.length);
  while (partsA.length < maxLen) partsA.push(0);
  while (partsB.length < maxLen) partsB.push(0);

  for (let i = 0; i < maxLen; i++) {
    if (partsA[i] < partsB[i]) return -1;
    if (partsA[i] > partsB[i]) return 1;
  }

  return 0;
}

/**
 * Get the appropriate store URL for the current platform
 */
function getStoreUrl(): string {
  return Platform.select({
    ios: STORE_URLS.ios,
    android: STORE_URLS.android,
    default: STORE_URLS.ios,
  }) as string;
}

/**
 * Hook to check if the app should display a blocking screen
 *
 * Priority:
 * 1. maintenance_mode - Immediate block for all users
 * 2. min_app_version - Force update if current version is below minimum
 *
 * @returns BlockingStatus object indicating whether to block and why
 */
export function useBlockingStatus(): BlockingStatus {
  const { isFeatureEnabled, getFeatureFlagPayload, isReady } = useAnalytics();

  // Don't block while PostHog is initializing
  if (!isReady) {
    return { isBlocked: false };
  }

  // Check 1: Maintenance mode (highest priority)
  const isMaintenanceMode = isFeatureEnabled('maintenance_mode');
  if (isMaintenanceMode === true) {
    return { isBlocked: true, reason: 'maintenance' };
  }

  // Check 2: Minimum app version
  const minVersion = getFeatureFlagPayload('min_app_version');
  if (typeof minVersion === 'string' && minVersion.length > 0) {
    const currentVersion = Application.nativeApplicationVersion || '0.0.0';

    if (compareVersions(currentVersion, minVersion) < 0) {
      return {
        isBlocked: true,
        reason: 'update_required',
        storeUrl: getStoreUrl(),
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Get the current native app version
 * Useful for debugging and display
 */
export function getAppVersion(): string {
  return Application.nativeApplicationVersion || '0.0.0';
}

/**
 * Get the current native build number
 * Useful for debugging
 */
export function getBuildNumber(): string {
  return Application.nativeBuildVersion || '0';
}
