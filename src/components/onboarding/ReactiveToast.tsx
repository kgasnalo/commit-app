/**
 * ReactiveToast - Animated toast bubble component
 * Phase 2.0.2 - The Reactive Toast System
 *
 * Small text bubbles that popup during input to comment on user data.
 * Uses react-native-reanimated layout animations for smooth entrance/exit.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ReactiveToast as ToastType, ToastType as ToastVariant } from '../../types/atmosphere.types';
import { SPRING_CONFIGS } from '../../config/animation';
import { colors, typography, spacing } from '../../theme';

interface ReactiveToastProps {
  toast: ToastType;
  onDismiss?: () => void;
}

// Toast styling based on type
const TOAST_STYLES: Record<
  ToastVariant,
  { backgroundColor: string; borderColor: string; iconName: keyof typeof Ionicons.glyphMap; iconColor: string }
> = {
  encouragement: {
    backgroundColor: 'rgba(74, 111, 165, 0.9)', // Blue
    borderColor: 'rgba(74, 111, 165, 1)',
    iconName: 'sparkles',
    iconColor: '#FFFFFF',
  },
  warning: {
    backgroundColor: 'rgba(139, 0, 0, 0.9)', // Red
    borderColor: 'rgba(139, 0, 0, 1)',
    iconName: 'warning',
    iconColor: '#FFD700',
  },
  celebration: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)', // Gold
    borderColor: 'rgba(255, 215, 0, 1)',
    iconName: 'trophy',
    iconColor: '#1A1A1A',
  },
};

export default function ReactiveToast({ toast, onDismiss }: ReactiveToastProps) {
  const style = TOAST_STYLES[toast.type];

  return (
    <Animated.View
      entering={FadeInUp.springify()
        .damping(SPRING_CONFIGS.smooth.damping)
        .stiffness(SPRING_CONFIGS.smooth.stiffness)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={style.iconName} size={18} color={style.iconColor} />
      </View>
      <Text
        style={[
          styles.message,
          toast.type === 'celebration' && styles.celebrationText,
        ]}
      >
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: spacing.sm,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  message: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: '500',
    flexShrink: 1,
  },
  celebrationText: {
    color: '#1A1A1A', // Dark text on gold background
  },
});
