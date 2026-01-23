/**
 * LivingBackground - Animated Mesh Gradient Background
 * Phase 2.0.1 - The Living Background
 *
 * A full-screen animated background with slowly moving color orbs
 * that morphs between Act color themes during transitions.
 */

import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import {
  Canvas,
  Circle,
  RadialGradient,
  vec,
  Group,
  Blur,
  Paint,
  BlendMode,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useDerivedValue,
  interpolateColor,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { useOnboardingAtmosphere } from '../../hooks/useOnboardingAtmosphere';
import {
  ACT_THEMES,
  ORB_CONFIG,
  TIMING_CONFIGS,
  EASING_CURVES,
} from '../../config/animation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Orb configuration type
interface OrbData {
  x: SharedValue<number>;
  y: SharedValue<number>;
  radius: number;
  colorIndex: number;
}

// Pre-calculate orb initial positions
const generateInitialOrbs = (): Array<{
  initialX: number;
  initialY: number;
  radius: number;
  colorIndex: number;
  durationX: number;
  durationY: number;
  amplitudeX: number;
  amplitudeY: number;
}> => {
  const { count, minRadius, maxRadius, movementDuration, movementAmplitude } = ORB_CONFIG;

  return Array.from({ length: count }, (_, index) => ({
    initialX: (SCREEN_WIDTH / (count + 1)) * (index + 1) + (Math.random() - 0.5) * 100,
    initialY: (SCREEN_HEIGHT / (count + 1)) * (index + 1) + (Math.random() - 0.5) * 100,
    radius: minRadius + Math.random() * (maxRadius - minRadius),
    colorIndex: index % 4,
    durationX: movementDuration.min + Math.random() * (movementDuration.max - movementDuration.min),
    durationY: movementDuration.min + Math.random() * (movementDuration.max - movementDuration.min),
    amplitudeX: movementAmplitude.min + Math.random() * (movementAmplitude.max - movementAmplitude.min),
    amplitudeY: movementAmplitude.min + Math.random() * (movementAmplitude.max - movementAmplitude.min),
  }));
};

const INITIAL_ORBS = generateInitialOrbs();

/**
 * Individual animated orb component
 */
function AnimatedOrb({
  orbConfig,
  colorProgress,
  currentAct,
}: {
  orbConfig: (typeof INITIAL_ORBS)[0];
  colorProgress: SharedValue<number>;
  currentAct: string;
}) {
  // Position animations
  const x = useSharedValue(orbConfig.initialX);
  const y = useSharedValue(orbConfig.initialY);

  // Start oscillating movement
  useEffect(() => {
    // X movement
    x.value = withRepeat(
      withSequence(
        withTiming(orbConfig.initialX + orbConfig.amplitudeX, {
          duration: orbConfig.durationX,
          easing: EASING_CURVES.organic,
        }),
        withTiming(orbConfig.initialX - orbConfig.amplitudeX, {
          duration: orbConfig.durationX,
          easing: EASING_CURVES.organic,
        })
      ),
      -1, // Infinite repeat
      true // Reverse
    );

    // Y movement (slightly different timing for organic feel)
    y.value = withRepeat(
      withSequence(
        withTiming(orbConfig.initialY + orbConfig.amplitudeY, {
          duration: orbConfig.durationY * 1.1,
          easing: EASING_CURVES.organic,
        }),
        withTiming(orbConfig.initialY - orbConfig.amplitudeY, {
          duration: orbConfig.durationY * 1.1,
          easing: EASING_CURVES.organic,
        })
      ),
      -1,
      true
    );

    // Cleanup: cancel infinite animations on unmount
    return () => {
      cancelAnimation(x);
      cancelAnimation(y);
    };
  }, []);

  // Derive color from current Act (v3 style - no dependency array needed)
  const orbColor = useDerivedValue(() => {
    const act1Color = ACT_THEMES.act1.orbColors[orbConfig.colorIndex];
    const act2Color = ACT_THEMES.act2.orbColors[orbConfig.colorIndex];
    const act3Color = ACT_THEMES.act3.orbColors[orbConfig.colorIndex];

    // Interpolate based on progress (0 = act1, 0.5 = act2, 1 = act3)
    return interpolateColor(
      colorProgress.value,
      [0, 0.5, 1],
      [act1Color, act2Color, act3Color]
    );
  });

  // Create derived values for Skia - avoid reading .value during render
  const cx = useDerivedValue(() => x.value);
  const cy = useDerivedValue(() => y.value);

  // Derive gradient colors to avoid reading .value during render
  const gradientColors = useDerivedValue((): string[] => {
    return [orbColor.value, 'transparent'];
  });

  return (
    <Circle cx={cx} cy={cy} r={orbConfig.radius} opacity={0.6}>
      <RadialGradient
        c={vec(orbConfig.initialX, orbConfig.initialY)}
        r={orbConfig.radius}
        colors={gradientColors}
      />
    </Circle>
  );
}

/**
 * Main LivingBackground component
 */
export default function LivingBackground() {
  const { currentAct, isTransitioning } = useOnboardingAtmosphere();

  // Progress value for color interpolation (0 = act1, 0.5 = act2, 1 = act3)
  const colorProgress = useSharedValue(0);

  // Update color progress when Act changes
  useEffect(() => {
    let targetProgress = 0;
    if (currentAct === 'act2') targetProgress = 0.5;
    if (currentAct === 'act3') targetProgress = 1;

    colorProgress.value = withTiming(targetProgress, {
      duration: TIMING_CONFIGS.actTransition.duration,
      easing: TIMING_CONFIGS.actTransition.easing,
    });
  }, [currentAct]);

  // Derive background color (v3 style - no dependency array needed)
  const backgroundColor = useDerivedValue(() => {
    return interpolateColor(
      colorProgress.value,
      [0, 0.5, 1],
      [ACT_THEMES.act1.primary, ACT_THEMES.act2.primary, ACT_THEMES.act3.primary]
    );
  });

  // Animated background style
  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  return (
    <Animated.View
      style={[styles.container, backgroundStyle]}
      pointerEvents="none"
    >
      <Canvas style={styles.canvas}>
        <Group>
          {INITIAL_ORBS.map((orbConfig, index) => (
            <AnimatedOrb
              key={`orb-${index}`}
              orbConfig={orbConfig}
              colorProgress={colorProgress}
              currentAct={currentAct}
            />
          ))}
        </Group>
        <Blur blur={ORB_CONFIG.blurAmount} />
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  canvas: {
    flex: 1,
  },
});
