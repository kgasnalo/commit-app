import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Completion messages for retention flow (Japanese fallback)
const COMPLETION_MESSAGES = [
  "多くの人が「途中」でやめてしまう中、\nあなたは最後までやり切りました。\nこの流れのまま、次の1冊を選びにいきましょう。",
  "忙しい中でも、学ぶ時間を確保できたこと自体が成果です。\nこの積み重ねが、数ヶ月後に大きな差になります。\n次の一冊で、流れを止めずにいきましょう。",
  "この1冊から得た知識は、あなたの中に確かに蓄積されました。\n学びは、次の行動によって価値に変わります。\n余韻が残っている今のうちに、次の1冊を選んでみましょう。",
  "この1冊は、あなたの判断力と視座を確実に引き上げました。\nインプットは、使ってこそ資産になります。\nさらなる知識強化のために、次の一冊を今ここで選びましょう。",
];

interface VerificationSuccessModalProps {
  visible: boolean;
  savedAmount: number;
  currency: string;
  onClose: () => void;
  onContinue?: () => void;
  onSelectNewBook?: () => void;
}

export default function VerificationSuccessModal({
  visible,
  savedAmount,
  currency,
  onClose,
  onContinue,
  onSelectNewBook,
}: VerificationSuccessModalProps) {
  const confettiRef = useRef<any>(null);
  const prevVisibleRef = useRef(false);
  const [motivationKey, setMotivationKey] = React.useState(1);

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const counterValue = useSharedValue(0);
  const [displayAmount, setDisplayAmount] = React.useState(0);

  // Pick a new random completion message each time modal opens
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      // Modal just became visible - pick new random message index
      const randomIndex = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
      setMotivationKey(randomIndex);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  // Get the completion message (stable during visibility)
  const completionMessage = useMemo(() => {
    // Try i18n first, fallback to hardcoded Japanese messages
    const i18nMessage = i18n.t(`celebration.completion_${motivationKey + 1}`, {
      defaultValue: ''
    });
    return i18nMessage || COMPLETION_MESSAGES[motivationKey] || COMPLETION_MESSAGES[0];
  }, [motivationKey]);

  const getCurrencySymbol = (curr: string) => {
    const symbols: { [key: string]: string } = {
      JPY: '¥', USD: '$', EUR: '€', GBP: '£', CNY: '¥', KRW: '₩'
    };
    return symbols[curr] || curr;
  };

  useEffect(() => {
    if (visible) {
      // Reset values
      scale.value = 0;
      opacity.value = 0;
      counterValue.value = 0;
      setDisplayAmount(0);

      // Start animations
      opacity.value = withSpring(1);
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );

      // Counter animation
      const duration = 1500;
      const steps = 30;
      const increment = savedAmount / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayAmount(savedAmount);
          clearInterval(interval);
        } else {
          setDisplayAmount(Math.floor(increment * currentStep));
        }
      }, duration / steps);

      // Trigger confetti after a short delay
      setTimeout(() => {
        confettiRef.current?.start();
      }, 300);

      return () => clearInterval(interval);
    }
  }, [visible, savedAmount]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
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
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
          fallSpeed={3000}
          explosionSpeed={350}
          colors={['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da']}
        />

        <Animated.View style={[styles.content, containerStyle]}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {i18n.t('celebration.title', { defaultValue: 'Commitment Achieved!' })}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {i18n.t('celebration.subtitle', { defaultValue: 'You kept your promise!' })}
          </Text>

          {/* Completion Message */}
          <Text style={styles.motivationText}>
            {completionMessage}
          </Text>

          {/* Money Saved Counter */}
          <View style={styles.savedContainer}>
            <Text style={styles.savedLabel}>
              {i18n.t('celebration.money_saved', { defaultValue: 'Money Saved' })}
            </Text>
            <Text style={styles.savedAmount}>
              {getCurrencySymbol(currency)}{displayAmount.toLocaleString()}
            </Text>
            <Text style={styles.savedNote}>
              {i18n.t('celebration.saved_note', { defaultValue: 'Your pledge stays with you!' })}
            </Text>
          </View>

          {/* Continue Reading Button (Primary) - Set next goal for same book */}
          {onContinue && (
            <TouchableOpacity style={styles.button} onPress={onContinue}>
              <Text style={styles.buttonText}>
                {i18n.t('celebration.continue_reading', { defaultValue: '次の目標を立てる' })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Select Next Book Button (Secondary) - Choose a new book */}
          {onSelectNewBook && (
            <TouchableOpacity style={styles.outlineButton} onPress={onSelectNewBook}>
              <Text style={styles.outlineButtonText}>
                {i18n.t('celebration.select_new_book', { defaultValue: '次の1冊を選ぶ' })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Finish for now (Text Link) */}
          <TouchableOpacity style={styles.textLinkButton} onPress={onClose}>
            <Text style={styles.textLinkText}>
              {i18n.t('celebration.finish_for_now', { defaultValue: 'Finish for now' })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 24,
    maxWidth: 340,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  savedContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  savedLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  savedAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#4caf50',
    marginBottom: 4,
  },
  savedNote: {
    fontSize: 12,
    color: '#888',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  outlineButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textLinkButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
  },
  textLinkText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
