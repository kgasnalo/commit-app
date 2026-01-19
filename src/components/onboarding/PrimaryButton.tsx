import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, typography, borderRadius } from '../../theme';
import { HapticsService } from '../../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../../config/haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(
      HAPTIC_BUTTON_SCALES.medium.pressed,
      HAPTIC_BUTTON_SCALES.medium.spring
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, HAPTIC_BUTTON_SCALES.medium.spring);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    HapticsService.feedbackMedium();
    onPress();
  };

  return (
    <AnimatedTouchable
      style={[styles.container, disabled && styles.disabled, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.primary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent.primary,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.text.primary,
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold,
  },
});
