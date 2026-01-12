import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { HapticsService } from '../../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../../config/haptics';
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

  // Button press scale for Piano Black luxury feel
  const shareButtonScale = useSharedValue(1);

  const shareButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareButtonScale.value }],
  }));

  const handleSharePressIn = () => {
    shareButtonScale.value = withSpring(
      HAPTIC_BUTTON_SCALES.heavy.pressed,
      HAPTIC_BUTTON_SCALES.heavy.spring
    );
  };

  const handleSharePressOut = () => {
    shareButtonScale.value = withSpring(1, HAPTIC_BUTTON_SCALES.heavy.spring);
  };

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
          <Animated.View style={shareButtonAnimatedStyle}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                HapticsService.feedbackHeavy();
                handleShare();
              }}
              onPressIn={handleSharePressIn}
              onPressOut={handleSharePressOut}
              disabled={isGenerating}
              activeOpacity={0.9}
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
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 4, 0.96)',
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
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
  // Receipt with ambient glow
  previewContainer: {
    marginBottom: 28,
    // Glowing card effect
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  // Piano Black share button with orange glow
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    paddingHorizontal: 56,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Strong orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
});
