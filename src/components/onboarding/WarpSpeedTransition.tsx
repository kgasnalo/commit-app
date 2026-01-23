/**
 * WarpSpeedTransition Component
 * Phase 2.3.3 - The Warp Speed (Post-subscription)
 *
 * EPIC Full-screen hyperspace transition effect using Skia.
 * Dense colorful star trails, camera shake, and cinematic timing.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import {
  Canvas,
  Group,
  Line,
  Circle,
  RadialGradient,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  useDerivedValue,
  Easing,
  SharedValue,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';
import { colors } from '../../theme';
import { ACT_THEMES } from '../../config/animation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;

// ============================================
// EPIC Animation timing (Extended for impact)
// ============================================
const WARP_START_DELAY = 0;
const ACCELERATION_DURATION = 1500;  // Longer build-up
const FULL_SPEED_DURATION = 1500;    // Enjoy the speed
const FLASH_DURATION = 400;
const FADE_OUT_DURATION = 300;
const TOTAL_DURATION = ACCELERATION_DURATION + FULL_SPEED_DURATION + FLASH_DURATION + FADE_OUT_DURATION;

// ============================================
// Star configuration (DENSE & COLORFUL)
// ============================================
const STAR_COUNT = 250;  // 4x more stars
const MAX_TRAIL_LENGTH = 300;  // Longer trails

// Star colors for variety
const STAR_COLORS = [
  '#00FFFF',  // Cyan
  '#FF00FF',  // Magenta
  '#FFD700',  // Gold
  '#FFFFFF',  // White
  '#FFFFFF',  // White (more common)
  '#00FFFF',  // Cyan
  '#FFFFFF',  // White
];

interface Star {
  id: number;
  angle: number;
  initialDistance: number;
  speed: number;
  brightness: number;
  color: string;
  layer: number; // 0 = far, 1 = mid, 2 = close (affects speed and size)
}

interface WarpSpeedTransitionProps {
  visible: boolean;
  onComplete: () => void;
}

// Generate random stars with colors and layers
function generateStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const layer = Math.floor(Math.random() * 3); // 0, 1, or 2
    const baseSpeed = 0.5 + layer * 0.3; // Closer = faster

    return {
      id: i,
      angle: (Math.PI * 2 * i) / STAR_COUNT + (Math.random() - 0.5) * 0.5,
      initialDistance: 10 + Math.random() * 100,
      speed: baseSpeed + Math.random() * 0.4,
      brightness: 0.4 + Math.random() * 0.6,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      layer,
    };
  });
}

// Single star trail component with color
interface StarTrailProps {
  star: Star;
  progress: Readonly<SharedValue<number>>;
}

function StarTrail({ star, progress }: StarTrailProps) {
  // Calculate star position based on progress (faster movement)
  const startX = useDerivedValue(() => {
    const distance = star.initialDistance + progress.value * 600 * star.speed;
    return CENTER_X + Math.cos(star.angle) * distance;
  });

  const startY = useDerivedValue(() => {
    const distance = star.initialDistance + progress.value * 600 * star.speed;
    return CENTER_Y + Math.sin(star.angle) * distance;
  });

  const endX = useDerivedValue(() => {
    // Trail length increases exponentially with progress for dramatic effect
    const trailMultiplier = 1 + progress.value * progress.value * 2;
    const trailLength = progress.value * MAX_TRAIL_LENGTH * star.speed * trailMultiplier;
    const distance = star.initialDistance + progress.value * 600 * star.speed - trailLength;
    return CENTER_X + Math.cos(star.angle) * Math.max(0, distance);
  });

  const endY = useDerivedValue(() => {
    const trailMultiplier = 1 + progress.value * progress.value * 2;
    const trailLength = progress.value * MAX_TRAIL_LENGTH * star.speed * trailMultiplier;
    const distance = star.initialDistance + progress.value * 600 * star.speed - trailLength;
    return CENTER_Y + Math.sin(star.angle) * Math.max(0, distance);
  });

  // Thicker trails at high speeds
  const strokeWidth = useDerivedValue(() => {
    const baseWidth = 1 + star.layer * 0.5;
    const speedBonus = progress.value * progress.value * 4;
    return baseWidth + speedBonus;
  });

  const opacity = useDerivedValue(() => {
    // Fade in, maintain bright, then check bounds
    const fadeIn = Math.min(1, progress.value * 4);
    const isOffscreen =
      startX.value < -100 ||
      startX.value > SCREEN_WIDTH + 100 ||
      startY.value < -100 ||
      startY.value > SCREEN_HEIGHT + 100;
    return isOffscreen ? 0 : fadeIn * star.brightness;
  });

  // Parse color to rgba
  const colorWithOpacity = useDerivedValue(() => {
    const hex = star.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity.value})`;
  });

  return (
    <Line
      p1={vec(startX.value, startY.value)}
      p2={vec(endX.value, endY.value)}
      color={colorWithOpacity.value}
      strokeWidth={strokeWidth.value}
      strokeCap="round"
    />
  );
}

export default function WarpSpeedTransition({
  visible,
  onComplete,
}: WarpSpeedTransitionProps) {
  const warpProgress = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const centerGlowRadius = useSharedValue(100);

  const stars = useMemo(() => generateStars(), []);

  // Haptic feedback functions
  const triggerLightHaptic = () => {
    HapticsService.feedbackLight();
  };

  const triggerMediumHaptic = () => {
    HapticsService.feedbackMedium();
  };

  const triggerHeavyHaptic = () => {
    HapticsService.feedbackHeavy();
  };

  const triggerFlashHaptic = () => {
    HapticsService.feedbackSuccess();
  };

  useEffect(() => {
    if (!visible) {
      // Reset when hidden
      warpProgress.value = 0;
      flashOpacity.value = 0;
      containerOpacity.value = 0;
      shakeX.value = 0;
      shakeY.value = 0;
      centerGlowRadius.value = 100;
      return;
    }

    // Start warp sequence
    containerOpacity.value = withTiming(1, { duration: 150 });

    // Center glow expands during warp
    centerGlowRadius.value = withTiming(300, {
      duration: ACCELERATION_DURATION + FULL_SPEED_DURATION,
      easing: Easing.out(Easing.quad),
    });

    // Warp acceleration with exponential easing for dramatic entry
    warpProgress.value = withDelay(
      WARP_START_DELAY,
      withTiming(1, {
        duration: ACCELERATION_DURATION + FULL_SPEED_DURATION,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );

    // Camera shake during peak speed (turbulence effect)
    const shakeStartDelay = ACCELERATION_DURATION;
    const shakeDuration = FULL_SPEED_DURATION;

    // Horizontal shake
    shakeX.value = withDelay(
      shakeStartDelay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 50, easing: Easing.linear }),
          withTiming(8, { duration: 50, easing: Easing.linear }),
          withTiming(-6, { duration: 40, easing: Easing.linear }),
          withTiming(6, { duration: 40, easing: Easing.linear }),
          withTiming(-4, { duration: 30, easing: Easing.linear }),
          withTiming(4, { duration: 30, easing: Easing.linear }),
          withTiming(0, { duration: 20, easing: Easing.linear })
        ),
        Math.ceil(shakeDuration / 260),
        false
      )
    );

    // Vertical shake (slightly offset from horizontal)
    shakeY.value = withDelay(
      shakeStartDelay + 25,
      withRepeat(
        withSequence(
          withTiming(6, { duration: 45, easing: Easing.linear }),
          withTiming(-6, { duration: 45, easing: Easing.linear }),
          withTiming(4, { duration: 35, easing: Easing.linear }),
          withTiming(-4, { duration: 35, easing: Easing.linear }),
          withTiming(2, { duration: 25, easing: Easing.linear }),
          withTiming(-2, { duration: 25, easing: Easing.linear }),
          withTiming(0, { duration: 20, easing: Easing.linear })
        ),
        Math.ceil(shakeDuration / 230),
        false
      )
    );

    // Flash at peak with longer build
    flashOpacity.value = withDelay(
      ACCELERATION_DURATION + FULL_SPEED_DURATION - 200,
      withSequence(
        withTiming(1, { duration: FLASH_DURATION / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: FLASH_DURATION / 2 + FADE_OUT_DURATION, easing: Easing.in(Easing.quad) })
      )
    );

    // Progressive haptic feedback during acceleration
    const hapticTimers: NodeJS.Timeout[] = [];

    // Build-up haptics (Light -> Medium -> Heavy)
    hapticTimers.push(setTimeout(triggerLightHaptic, 300));
    hapticTimers.push(setTimeout(triggerLightHaptic, 600));
    hapticTimers.push(setTimeout(triggerMediumHaptic, 900));
    hapticTimers.push(setTimeout(triggerMediumHaptic, 1200));
    hapticTimers.push(setTimeout(triggerHeavyHaptic, 1500));

    // Peak speed haptics
    hapticTimers.push(setTimeout(triggerHeavyHaptic, 1800));
    hapticTimers.push(setTimeout(triggerHeavyHaptic, 2200));
    hapticTimers.push(setTimeout(triggerHeavyHaptic, 2600));

    // Flash haptic
    hapticTimers.push(setTimeout(triggerFlashHaptic, ACCELERATION_DURATION + FULL_SPEED_DURATION));

    // Complete callback
    const completeTimer = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION);

    return () => {
      hapticTimers.forEach(clearTimeout);
      clearTimeout(completeTimer);
      cancelAnimation(shakeX);
      cancelAnimation(shakeY);
      cancelAnimation(warpProgress);
      cancelAnimation(containerOpacity);
      cancelAnimation(flashOpacity);
      cancelAnimation(centerGlowRadius);
    };
  }, [visible, onComplete]);

  // Animated styles with camera shake
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // Derived values for Skia
  const currentProgress = useDerivedValue(() => warpProgress.value);
  const currentGlowRadius = useDerivedValue(() => centerGlowRadius.value);

  // Center glow opacity increases with progress
  const glowOpacity = useDerivedValue(() => {
    return interpolate(warpProgress.value, [0, 0.3, 1], [0.3, 0.8, 1]);
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Star field */}
      <Canvas style={styles.canvas}>
        <Group>
          {/* Center glow - expands and intensifies */}
          <Circle cx={CENTER_X} cy={CENTER_Y} r={currentGlowRadius.value}>
            <RadialGradient
              c={vec(CENTER_X, CENTER_Y)}
              r={currentGlowRadius.value}
              colors={[
                `rgba(255, 215, 0, ${glowOpacity.value * 0.6})`,  // Gold center
                `rgba(255, 0, 255, ${glowOpacity.value * 0.3})`,  // Magenta mid
                'transparent'
              ]}
            />
            <BlurMask blur={50} style="normal" />
          </Circle>

          {/* Secondary glow ring */}
          <Circle cx={CENTER_X} cy={CENTER_Y} r={currentGlowRadius.value * 0.6}>
            <RadialGradient
              c={vec(CENTER_X, CENTER_Y)}
              r={currentGlowRadius.value * 0.6}
              colors={[
                `rgba(0, 255, 255, ${glowOpacity.value * 0.5})`,  // Cyan core
                'transparent'
              ]}
            />
            <BlurMask blur={30} style="normal" />
          </Circle>

          {/* Star trails */}
          {stars.map((star) => (
            <StarTrail key={star.id} star={star} progress={currentProgress} />
          ))}
        </Group>
      </Canvas>

      {/* White flash overlay */}
      <Animated.View style={[styles.flash, flashStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    zIndex: 1000,
  },
  canvas: {
    flex: 1,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
});
