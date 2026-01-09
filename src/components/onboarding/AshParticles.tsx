/**
 * AshParticles Component
 * Phase 2.2.2 - Screen 7 Ash Effect
 *
 * Animated particles that float upward from the burn line,
 * simulating ash/embers from burning text.
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Circle, Group, Blur } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  useDerivedValue,
  SharedValue,
  interpolate,
} from 'react-native-reanimated';
import { ACT_THEMES } from '../../config/animation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Particle configuration
interface ParticleConfig {
  id: number;
  initialX: number;
  initialY: number;
  size: number;
  delay: number; // Delay before this particle starts animating
  duration: number;
  color: string;
  driftX: number; // Horizontal drift amount
}

interface AshParticlesProps {
  burnProgress: SharedValue<number>;
  particleCount?: number;
  width?: number;
  height?: number;
  active: boolean;
}

// Generate random particle configurations
const generateParticles = (
  count: number,
  width: number,
  height: number
): ParticleConfig[] => {
  const particles: ParticleConfig[] = [];
  const colors = [
    '#333333', // Dark ash
    '#555555', // Gray ash
    '#FF4500', // Orange ember
    '#8B0000', // Dark red ember
    ACT_THEMES.act2.orbColors[1], // Crimson
  ];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      initialX: Math.random() * width,
      initialY: Math.random() * height,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 2000, // 0-2s delay
      duration: 1500 + Math.random() * 1500, // 1.5-3s duration
      color: colors[Math.floor(Math.random() * colors.length)],
      driftX: (Math.random() - 0.5) * 60, // -30 to +30px drift
    });
  }

  return particles;
};

/**
 * Individual animated particle
 */
function AshParticle({
  config,
  burnProgress,
  containerHeight,
  active,
}: {
  config: ParticleConfig;
  burnProgress: SharedValue<number>;
  containerHeight: number;
  active: boolean;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Derived burn line position (where particles should spawn)
  const burnLineY = useDerivedValue(() => {
    return burnProgress.value * containerHeight;
  });

  // Start animation when burn reaches this particle's initial Y position
  useEffect(() => {
    if (!active) {
      // Reset particle
      translateY.value = 0;
      translateX.value = 0;
      opacity.value = 0;
      rotation.value = 0;
      return;
    }

    // Delay based on particle config + relative position
    const totalDelay = config.delay;

    // Fade in
    opacity.value = withDelay(
      totalDelay,
      withTiming(0.9, { duration: 200 })
    );

    // Float upward
    translateY.value = withDelay(
      totalDelay,
      withTiming(-containerHeight * 0.6, {
        duration: config.duration,
        easing: Easing.out(Easing.quad),
      })
    );

    // Horizontal drift
    translateX.value = withDelay(
      totalDelay,
      withTiming(config.driftX, {
        duration: config.duration,
        easing: Easing.inOut(Easing.sin),
      })
    );

    // Rotation
    rotation.value = withDelay(
      totalDelay,
      withTiming(Math.random() * 360, {
        duration: config.duration,
      })
    );

    // Fade out at end
    opacity.value = withDelay(
      totalDelay + config.duration * 0.6,
      withTiming(0, { duration: config.duration * 0.4 })
    );
  }, [active]);

  // Animated style for the particle container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: config.initialX,
          top: config.initialY,
          width: config.size,
          height: config.size,
          backgroundColor: config.color,
          borderRadius: config.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Ember particle with glow effect (using Skia)
 */
function EmberParticle({
  config,
  burnProgress,
  containerHeight,
  active,
}: {
  config: ParticleConfig;
  burnProgress: SharedValue<number>;
  containerHeight: number;
  active: boolean;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      translateY.value = 0;
      opacity.value = 0;
      glowIntensity.value = 0;
      return;
    }

    const totalDelay = config.delay;

    // Ember glow pulse
    glowIntensity.value = withDelay(
      totalDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0.3, { duration: 300 })
        ),
        3,
        true
      )
    );

    // Fade in and out
    opacity.value = withDelay(
      totalDelay,
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(config.duration * 0.7, withTiming(0, { duration: config.duration * 0.3 }))
      )
    );

    // Float up
    translateY.value = withDelay(
      totalDelay,
      withTiming(-containerHeight * 0.4, {
        duration: config.duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(glowIntensity.value, [0, 1], [4, 12]),
  }));

  // Only render ember particles (orange/red colored)
  if (!config.color.includes('FF') && !config.color.includes('8B')) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: config.initialX,
          top: config.initialY,
          width: config.size * 1.5,
          height: config.size * 1.5,
          backgroundColor: config.color,
          borderRadius: config.size,
          shadowColor: '#FF4500',
        },
        animatedStyle,
        glowStyle,
      ]}
    />
  );
}

export default function AshParticles({
  burnProgress,
  particleCount = 15,
  width = SCREEN_WIDTH - 48,
  height = 200,
  active,
}: AshParticlesProps) {
  // Generate particles only once
  const particles = useMemo(
    () => generateParticles(particleCount, width, height),
    [particleCount, width, height]
  );

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {/* Regular ash particles */}
      {particles.map((config) => (
        <AshParticle
          key={`ash-${config.id}`}
          config={config}
          burnProgress={burnProgress}
          containerHeight={height}
          active={active}
        />
      ))}

      {/* Ember particles (subset with glow) */}
      {particles.slice(0, Math.floor(particleCount / 3)).map((config) => (
        <EmberParticle
          key={`ember-${config.id}`}
          config={{
            ...config,
            delay: config.delay + 500, // Embers appear slightly after ash
          }}
          burnProgress={burnProgress}
          containerHeight={height}
          active={active}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
  },
  ember: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
  },
});
