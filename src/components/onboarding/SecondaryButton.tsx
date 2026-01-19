import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
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
};

export default function SecondaryButton({ label, onPress, disabled }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(
      HAPTIC_BUTTON_SCALES.light.pressed,
      HAPTIC_BUTTON_SCALES.light.spring
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, HAPTIC_BUTTON_SCALES.light.spring);
  };

  const handlePress = () => {
    if (disabled) return;
    HapticsService.feedbackLight();
    onPress();
  };

  return (
    <AnimatedTouchable
      style={[styles.container, disabled && styles.disabled, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.label}>{label}</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
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
