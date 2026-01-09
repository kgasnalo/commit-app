import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { shareImage } from '../../utils/shareUtils';
import CommitmentReceipt, { CommitmentReceiptProps } from './CommitmentReceipt';

interface ReceiptPreviewModalProps extends CommitmentReceiptProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReceiptPreviewModal({
  visible,
  onClose,
  bookTitle,
  bookAuthor,
  bookCoverUrl,
  completionDate,
  readingDays,
  savedAmount,
  currency,
}: ReceiptPreviewModalProps) {
  const receiptRef = useRef<View>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = useCallback(async () => {
    if (!receiptRef.current) return;

    setIsGenerating(true);
    try {
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const success = await shareImage(uri);
      if (success) {
        // Optionally close modal after successful share
        // onClose();
      }
    } catch (error) {
      console.error('Failed to capture/share receipt:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {i18n.t('receipt.preview_title')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Receipt Preview */}
          <View style={styles.previewContainer}>
            <View ref={receiptRef} collapsable={false}>
              <CommitmentReceipt
                bookTitle={bookTitle}
                bookAuthor={bookAuthor}
                bookCoverUrl={bookCoverUrl}
                completionDate={completionDate}
                readingDays={readingDays}
                savedAmount={savedAmount}
                currency={currency}
              />
            </View>
          </View>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.shareButtonText}>
                  {i18n.t('receipt.generating')}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="share-social" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>
                  {i18n.t('receipt.share')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4D00',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
