/**
 * Linking utilities with validation and error handling
 */

import { Linking, Alert, Platform } from 'react-native';
import i18n from '../i18n';
import { captureWarning } from './errorLogger';

/**
 * Safely opens a URL with validation and error handling.
 * Checks if the URL can be opened before attempting to open it.
 *
 * @param url - The URL to open
 * @param options - Optional configuration
 * @returns Promise<boolean> - Whether the URL was successfully opened
 */
export async function safeOpenURL(
  url: string,
  options?: {
    showErrorAlert?: boolean;
    errorTitle?: string;
    errorMessage?: string;
  }
): Promise<boolean> {
  const {
    showErrorAlert = true,
    errorTitle,
    errorMessage,
  } = options || {};

  try {
    // Validate URL format
    if (!url || typeof url !== 'string') {
      captureWarning('Invalid URL provided to safeOpenURL', {
        location: 'linkingUtils.safeOpenURL',
        extra: { url },
      });
      return false;
    }

    // Check if the URL can be opened
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      captureWarning('URL cannot be opened', {
        location: 'linkingUtils.safeOpenURL',
        extra: { url },
      });

      if (showErrorAlert) {
        Alert.alert(
          errorTitle || i18n.t('common.error'),
          errorMessage || i18n.t('errors.cannot_open_url')
        );
      }
      return false;
    }

    // Open the URL
    await Linking.openURL(url);
    return true;
  } catch (error) {
    captureWarning('Failed to open URL', {
      location: 'linkingUtils.safeOpenURL',
      extra: { url, error },
    });

    if (showErrorAlert) {
      Alert.alert(
        errorTitle || i18n.t('common.error'),
        errorMessage || i18n.t('errors.failed_to_open_url')
      );
    }
    return false;
  }
}

/**
 * Opens the app store for the current platform.
 *
 * @param appStoreId - iOS App Store ID
 * @param playStoreId - Android Play Store package name
 */
export async function openAppStore(
  appStoreId: string,
  playStoreId: string
): Promise<boolean> {
  const storeUrl = Platform.select({
    ios: `itms-apps://apps.apple.com/app/id${appStoreId}`,
    android: `market://details?id=${playStoreId}`,
  });

  if (!storeUrl) {
    return false;
  }

  // Try native store URL first
  const canOpenNative = await Linking.canOpenURL(storeUrl);

  if (canOpenNative) {
    return safeOpenURL(storeUrl, { showErrorAlert: false });
  }

  // Fallback to web URL
  const webUrl = Platform.select({
    ios: `https://apps.apple.com/app/id${appStoreId}`,
    android: `https://play.google.com/store/apps/details?id=${playStoreId}`,
  });

  if (webUrl) {
    return safeOpenURL(webUrl);
  }

  return false;
}
