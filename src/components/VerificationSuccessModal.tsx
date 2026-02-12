import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiEffect from './ConfettiEffect';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HapticsService } from '../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../config/haptics';
import i18n from '../i18n';
import ReceiptPreviewModal from './receipt/ReceiptPreviewModal';

interface VerificationSuccessModalProps {
  visible: boolean;
  savedAmount: number;
  currency: string;
  onClose: () => void;
  onContinue?: () => void;
  onSelectNewBook?: () => void;
  // Receipt data
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  completionDate?: Date;
  readingDays?: number;
}

export default function VerificationSuccessModal({
  visible,
  savedAmount,
  currency,
  onClose,
  onContinue,
  onSelectNewBook,
  bookTitle,
  bookAuthor,
  bookCoverUrl,
  completionDate,
  readingDays,
}: VerificationSuccessModalProps) {
  const prevVisibleRef = useRef(false);
  const [motivationKey, setMotivationKey] = useState(1);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Check if receipt data is available
  const hasReceiptData = bookTitle && completionDate && readingDays !== undefined;

  // Animation values
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);
  const amountScale = useSharedValue(1);
  const [displayAmount, setDisplayAmount] = React.useState(0);

  // Button press scale for Piano Black luxury feel
  const continueButtonScale = useSharedValue(1);

  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  const handleContinuePressIn = () => {
    continueButtonScale.value = withSpring(
      HAPTIC_BUTTON_SCALES.heavy.pressed,
      HAPTIC_BUTTON_SCALES.heavy.spring
    );
  };

  const handleContinuePressOut = () => {
    continueButtonScale.value = withSpring(1, HAPTIC_BUTTON_SCALES.heavy.spring);
  };

  // Pick a new random completion message index (0 to 3) each time modal opens
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      // Modal just became visible - pick new random message index (4 messages available)
      const randomIndex = Math.floor(Math.random() * 4);
      setMotivationKey(randomIndex);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  // Get the completion message (stable during visibility)
  const completionMessage = useMemo(() => {
    // Keys are 1-based (celebration.completion_1 to celebration.completion_4)
    return i18n.t(`celebration.completion_${motivationKey + 1}`);
  }, [motivationKey]);

  const getCurrencySymbol = (curr: string) => {
    const symbols: { [key: string]: string } = {
      JPY: '¥', USD: '$', EUR: '€', GBP: '£', CNY: '¥', KRW: '₩'
    };
    return symbols[curr] || curr;
  };

  // easeOutExpo: starts fast, slows down at the end
  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  useEffect(() => {
    if (visible) {
      // Reset values
      scale.value = 0.95;
      opacity.value = 0;
      amountScale.value = 1;
      setDisplayAmount(0);

      // Smooth entrance animation (premium feel)
      const entranceDuration = 300;
      const entranceEasing = Easing.out(Easing.cubic);

      opacity.value = withTiming(1, { duration: entranceDuration, easing: entranceEasing });
      scale.value = withTiming(1, { duration: entranceDuration, easing: entranceEasing });

      // Counter animation with easeOutExpo (starts fast, slows at end)
      const duration = 1500;
      const startTime = Date.now();
      let animationFrameId: number;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutExpo(progress);

        setDisplayAmount(Math.floor(savedAmount * easedProgress));

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setDisplayAmount(savedAmount);
          // Trigger "pop" effect when count-up finishes (climax animation)
          amountScale.value = withSequence(
            withTiming(1.15, { duration: 100, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: 100, easing: Easing.inOut(Easing.cubic) })
          );
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [visible, savedAmount]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const amountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: amountScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Confetti with warm colors */}
        <ConfettiEffect visible={visible} />

        <Animated.View style={[styles.content, containerStyle]}>
          {/* Thick Glass Block グラデーション */}
          <LinearGradient
            colors={['rgba(32, 28, 24, 0.98)', 'rgba(20, 18, 16, 0.99)', 'rgba(12, 10, 8, 1)']}
            locations={[0, 0.5, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />
          {/* 上部の柔らかいライト */}
          <LinearGradient
            colors={['rgba(255, 160, 120, 0.1)', 'transparent']}
            locations={[0, 0.5]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />

          {/* Success Icon - Blood Orange Glow */}
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow}>
              <Ionicons name="checkmark" size={48} color="#FF6B35" />
            </View>
          </View>

          {/* Title */}
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {i18n.t('celebration.title')}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {i18n.t('celebration.subtitle')}
          </Text>

          {/* Completion Message */}
          <Text style={styles.motivationText}>
            {completionMessage}
          </Text>

          {/* Reward Display - only shown when savedAmount > 0 */}
          {savedAmount > 0 && (
            <View style={styles.savedContainer}>
              <View style={styles.amountRow}>
                <Animated.Text style={[styles.currencySymbol, amountStyle]}>
                  {getCurrencySymbol(currency)}
                </Animated.Text>
                <Animated.Text style={[styles.savedAmount, amountStyle]}>
                  {displayAmount.toLocaleString()}
                </Animated.Text>
              </View>
              <Text style={styles.savedNote}>
                {i18n.t('celebration.saved_note')}
              </Text>
            </View>
          )}

          {/* Share Receipt Button */}
          {hasReceiptData && (
            <TouchableOpacity
              style={styles.shareReceiptButton}
              onPress={() => setShowReceiptModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social" size={16} color="#FF6B35" />
              <Text style={styles.shareReceiptText}>
                {i18n.t('receipt.share_button')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Continue Reading Button (Primary) - Piano Black */}
          {onContinue && (
            <Animated.View style={continueButtonAnimatedStyle}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  HapticsService.feedbackHeavy();
                  onContinue();
                }}
                onPressIn={handleContinuePressIn}
                onPressOut={handleContinuePressOut}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.08)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                />
                <Text style={styles.buttonText}>
                  {i18n.t('celebration.continue_reading')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Select Next Book Button (Secondary) */}
          {onSelectNewBook && (
            <TouchableOpacity style={styles.outlineButton} onPress={onSelectNewBook} activeOpacity={0.7}>
              <Text style={styles.outlineButtonText}>
                {i18n.t('celebration.select_new_book')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Finish for now (Text Link) */}
          <TouchableOpacity style={styles.textLinkButton} onPress={onClose}>
            <Text style={styles.textLinkText}>
              {i18n.t('celebration.finish_for_now')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Receipt Preview Modal */}
      {hasReceiptData && (
        <ReceiptPreviewModal
          visible={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          bookTitle={bookTitle}
          bookAuthor={bookAuthor || i18n.t('common.unknown_author')}
          bookCoverUrl={bookCoverUrl}
          completionDate={completionDate}
          readingDays={readingDays}
          savedAmount={savedAmount}
          currency={currency}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 24,
    maxWidth: 360,
    width: '100%',
    overflow: 'hidden',
    // Glass block shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  // Blood Orange Glow アイコン
  iconGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    // Strong glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FAFAFA',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    marginVertical: 12,
  },
  // 報酬表示 - Giant Glowing Numbers
  savedContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '500',
    color: 'rgba(255, 107, 53, 0.7)',
    marginRight: 4,
    // Subtle glow
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  savedAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FF6B35',
    // Strong glow
    textShadowColor: 'rgba(255, 107, 53, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  savedNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  shareReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  shareReceiptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  // Piano Black ボタン
  button: {
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Orange glow on press
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  outlineButtonText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  textLinkButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
  },
  textLinkText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
