/**
 * CountUpText Component
 *
 * Animates a number from 0 to target value with count-up effect.
 * Used in Screen 7 to dramatically reveal loss impact values.
 */

import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ACT_THEMES } from '../../config/animation';

interface CountUpTextProps {
  /** Target value to count up to */
  value: number;
  /** Prefix string (e.g., "¥", "$") */
  prefix?: string;
  /** Suffix string (e.g., "h", "books") */
  suffix?: string;
  /** Animation duration in ms (default: 1000) */
  duration?: number;
  /** Delay before animation starts in ms (default: 0) */
  delay?: number;
  /** Font size (default: 40) */
  fontSize?: number;
  /** Whether to use locale formatting for numbers */
  useLocaleFormat?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether the animation should start */
  active?: boolean;
}

export default function CountUpText({
  value,
  prefix = '',
  suffix = '',
  duration = 1000,
  delay = 0,
  fontSize = 40,
  useLocaleFormat = true,
  onComplete,
  active = true,
}: CountUpTextProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  // Update display value from animated value
  const updateDisplay = (val: number) => {
    setDisplayValue(Math.round(val));
  };

  // React to animated value changes
  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      runOnJS(updateDisplay)(currentValue);
    }
  );

  // Trigger animation when active changes
  useEffect(() => {
    if (active) {
      animatedValue.value = withDelay(
        delay,
        withTiming(value, {
          duration,
          easing: Easing.out(Easing.cubic),
        })
      );

      // Schedule completion callback
      if (onComplete) {
        const timeout = setTimeout(() => {
          onComplete();
        }, delay + duration);
        return () => clearTimeout(timeout);
      }
    } else {
      animatedValue.value = 0;
      setDisplayValue(0);
    }
  }, [active, value, delay, duration]);

  // Format the display number
  const formattedNumber = useLocaleFormat
    ? displayValue.toLocaleString()
    : displayValue.toString();
  const displayText = `${prefix}${formattedNumber}${suffix}`;

  // Calculate glow intensity based on progress
  const progress = value > 0 ? displayValue / value : 0;
  const glowIntensity = Math.sin(progress * Math.PI) * 20;

  return (
    <Text
      style={[
        styles.text,
        {
          fontSize,
          textShadowRadius: glowIntensity,
        },
      ]}
    >
      {displayText}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '800',
    color: ACT_THEMES.act2.orbColors[1],
    textShadowColor: ACT_THEMES.act2.accent,
    textShadowOffset: { width: 0, height: 0 },
    fontVariant: ['tabular-nums'],
  },
});
