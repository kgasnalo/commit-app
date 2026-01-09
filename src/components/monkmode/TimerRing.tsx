/**
 * TimerRing Component
 * Phase 4.3 - Monk Mode Circular Progress
 *
 * Animated circular progress ring for timer visualization.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useDerivedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerRingProps {
  progress: SharedValue<number>; // 0-1 (elapsed/total)
  size: number;
  strokeWidth?: number;
  backgroundColor?: string;
  progressColor?: string;
}

export default function TimerRing({
  progress,
  size,
  strokeWidth = 8,
  backgroundColor = colors.background.tertiary,
  progressColor = colors.accent.primary,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Derived value for stroke dash offset
  const strokeDashoffset = useDerivedValue(() => {
    // Progress goes from 0 to 1, so we subtract from circumference
    // At progress=0, offset=circumference (empty ring)
    // At progress=1, offset=0 (full ring)
    return circumference * (1 - progress.value);
  });

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
});
