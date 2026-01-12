/**
 * SessionCompleteModal Component
 * Phase 4.3 - Monk Mode Completion Celebration
 *
 * Celebratory modal shown when timer completes.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HapticsService } from '../../lib/HapticsService';
import { colors } from '../../theme/colors';
import { SPRING_CONFIGS } from '../../config/animation';
import i18n from '../../i18n';

interface SessionCompleteModalProps {
  visible: boolean;
  durationMinutes: number;
  bookTitle?: string;
  onClose: () => void;
  onStartAnother: () => void;
}

export default function SessionCompleteModal({
  visible,
  durationMinutes,
  bookTitle,
  onClose,
  onStartAnother,
}: SessionCompleteModalProps) {
  const checkmarkScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      // Trigger success haptic
      HapticsService.feedbackSuccess();

      // Phase 1: Checkmark bounces in
      checkmarkScale.value = withSpring(1, SPRING_CONFIGS.bouncy);

      // Phase 2: Content fades in
      setTimeout(() => {
        contentOpacity.value = withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.quad),
        });
        contentTranslateY.value = withSpring(0, SPRING_CONFIGS.smooth);
      }, 300);
    } else {
      // Reset animations
      checkmarkScale.value = 0;
      contentOpacity.value = 0;
      contentTranslateY.value = 20;
    }
  }, [visible]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Success Icon */}
          <Animated.View style={[styles.iconContainer, checkmarkStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
          </Animated.View>

          {/* Content */}
          <Animated.View style={[styles.content, contentStyle]}>
            <Text style={styles.title}>
              {i18n.t('monkmode.session_complete')}
            </Text>

            <Text style={styles.subtitle}>
              {i18n.t('monkmode.great_focus')}
            </Text>

            {/* Duration completed */}
            <View style={styles.statsContainer}>
              <Text style={styles.durationValue}>{durationMinutes}</Text>
              <Text style={styles.durationLabel}>
                {i18n.t('monkmode.minutes_completed')}
              </Text>
            </View>

            {/* Book title if provided */}
            {bookTitle && (
              <View style={styles.bookContainer}>
                <Ionicons name="book" size={16} color={colors.text.secondary} />
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {bookTitle}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {i18n.t('monkmode.save_session')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onStartAnother}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>
                  {i18n.t('monkmode.start_another')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.status.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.status.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  durationValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.accent.primary,
    letterSpacing: -2,
  },
  durationLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  bookTitle: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: colors.background.tertiary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
});
