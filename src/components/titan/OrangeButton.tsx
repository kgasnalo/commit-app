import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';

interface OrangeButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * OrangeButton
 *
 * 参考デザインの「New invoice」「Get Started」スタイルのボタン
 * オレンジ塗りつぶし + グロー効果
 */
export function OrangeButton({
  title,
  onPress,
  variant = 'filled',
  size = 'md',
  icon,
  disabled = false,
  style,
  textStyle,
}: OrangeButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (disabled) return;
    HapticsService.feedbackMedium();
    onPress();
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
  };

  const variantStyles = {
    filled: {
      container: styles.filledContainer,
      text: styles.filledText,
    },
    outline: {
      container: styles.outlineContainer,
      text: styles.outlineText,
    },
    ghost: {
      container: styles.ghostContainer,
      text: styles.ghostText,
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        currentVariant.container,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {icon && icon}
      <Text
        style={[
          styles.text,
          currentVariant.text,
          { fontSize: currentSize.fontSize },
          icon ? { marginLeft: 8 } : undefined,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  text: {
    fontWeight: '600',
  },

  // Filled variant (primary)
  filledContainer: {
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  filledText: {
    color: '#FFFFFF',
  },

  // Outline variant
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  outlineText: {
    color: '#FF6B35',
  },

  // Ghost variant (subtle)
  ghostContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  ghostText: {
    color: '#FF6B35',
  },

  disabled: {
    opacity: 0.5,
  },
});

export default OrangeButton;
