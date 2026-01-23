/**
 * PulsatingVignette Component
 * Phase 2.2.1 - Pulsating Red Vignette Overlay for Act 2
 *
 * Creates a dark, pulsating red vignette effect that intensifies
 * with the penalty amount slider.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useDerivedValue,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { EASING_CURVES, ACT_THEMES } from '../../config/animation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PulsatingVignetteProps {
  intensity: SharedValue<number>; // 0-1, from slider
  active: boolean;
}

export default function PulsatingVignette({
  intensity,
  active,
}: PulsatingVignetteProps) {
  const pulseValue = useSharedValue(0);

  // Start/stop pulsation based on active state
  useEffect(() => {
    if (active) {
      // Pulsation animation: 0 → 1 → 0 in 3 seconds (1.5s each direction)
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: EASING_CURVES.organic }),
          withTiming(0, { duration: 1500, easing: EASING_CURVES.organic })
        ),
        -1, // infinite
        true // reverse
      );
    } else {
      pulseValue.value = withTiming(0, { duration: 500 });
    }

    // Cleanup: cancel infinite animation on unmount
    return () => {
      cancelAnimation(pulseValue);
    };
  }, [active]);

  // Combined opacity from pulse + intensity
  const animatedOpacity = useDerivedValue(() => {
    if (!active) return 0;

    // Base opacity from intensity (0.1 to 0.4)
    const baseOpacity = 0.1 + intensity.value * 0.3;

    // Pulse adds variation (±0.15)
    const pulseVariation = pulseValue.value * 0.15;

    return baseOpacity + pulseVariation;
  });

  // Animated style for outer vignette
  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));

  // Inner glow intensity based on slider position
  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: intensity.value * 0.6 + pulseValue.value * 0.2,
  }));

  if (!active) return null;

  return (
    <>
      {/* Outer dark vignette - corners */}
      <Animated.View
        style={[styles.container, vignetteStyle]}
        pointerEvents="none"
      >
        {/* Top gradient */}
        <LinearGradient
          colors={['rgba(139, 0, 0, 0.8)', 'transparent']}
          style={styles.topGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(139, 0, 0, 0.8)']}
          style={styles.bottomGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Left gradient */}
        <LinearGradient
          colors={['rgba(139, 0, 0, 0.6)', 'transparent']}
          style={styles.leftGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
        {/* Right gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(139, 0, 0, 0.6)']}
          style={styles.rightGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>

      {/* Inner red glow - center pulsation */}
      <Animated.View
        style={[styles.innerGlow, innerGlowStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(220, 20, 60, 0.1)',
            'rgba(139, 0, 0, 0.2)',
            'transparent',
          ]}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.innerGlowGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
  },
  leftGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.2,
  },
  rightGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.2,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
  innerGlowGradient: {
    flex: 1,
  },
});
