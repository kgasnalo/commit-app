import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import i18n from '../i18n';

/**
 * Share an image file using the native share sheet
 * @param uri - The local file URI of the image to share
 * @returns true if sharing was successful, false otherwise
 */
export async function shareImage(uri: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('receipt.share_unavailable')
      );
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: i18n.t('receipt.share_dialog_title'),
      UTI: 'public.png', // iOS specific
    });

    return true;
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
}

/**
 * Check if sharing is available on this device
 */
export async function isShareAvailable(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}
