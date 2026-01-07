import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
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

interface VerificationSuccessModalProps {
  visible: boolean;
  savedAmount: number;
  currency: string;
  onClose: () => void;
  onContinue?: () => void;
}

export default function VerificationSuccessModal({
  visible,
  savedAmount,
  currency,
  onClose,
  onContinue,
}: VerificationSuccessModalProps) {
  const confettiRef = useRef<any>(null);

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const counterValue = useSharedValue(0);
  const [displayAmount, setDisplayAmount] = React.useState(0);

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

          {/* Continue Reading Button (Primary) */}
          {onContinue && (
            <TouchableOpacity style={styles.button} onPress={onContinue}>
              <Text style={styles.buttonText}>
                {i18n.t('celebration.continue_button', { defaultValue: 'Continue Reading' })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Return Button (Secondary) */}
          <TouchableOpacity
            style={onContinue ? styles.secondaryButton : styles.button}
            onPress={onClose}
          >
            <Text style={onContinue ? styles.secondaryButtonText : styles.buttonText}>
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
    marginBottom: 24,
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
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
