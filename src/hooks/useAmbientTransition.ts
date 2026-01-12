/**
 * useAmbientTransition Hook
 * Phase 4.5 - Advanced Animation Polish
 *
 * Provides "incandescent bulb" style slow fade animations.
 * 白熱電球のようなゆっくりとしたフェードイン/アウト効果
 */

import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { AMBIENT_TIMING_CONFIGS } from '../config/animation';

export interface AmbientTransitionOptions {
  /** Animation duration in ms (default: 700ms - incandescent) */
  duration?: number;
  /** Initial delay before animation starts in ms */
  delay?: number;
  /** Include subtle glow pulse on settle */
  withGlowPulse?: boolean;
  /** Initial scale value (default: 0.97) */
  initialScale?: number;
}

export interface AmbientTransitionReturn {
  /** Trigger the fade-in animation */
  fadeIn: () => void;
  /** Trigger the fade-out animation */
  fadeOut: () => void;
  /** Reset to initial state without animation */
  reset: () => void;
  /** Animated style to apply to the component */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Glow opacity shared value (for custom glow effects) */
  glowOpacity: SharedValue<number>;
}

/**
 * Hook for "incandescent bulb" style ambient transitions
 *
 * @example
 * ```tsx
 * function MyModal({ visible }) {
 *   const { fadeIn, animatedStyle } = useAmbientTransition({
 *     duration: 700,
 *     delay: 100,
 *   });
 *
 *   useEffect(() => {
 *     if (visible) fadeIn();
 *   }, [visible]);
 *
 *   return (
 *     <Animated.View style={animatedStyle}>
 *       <ModalContent />
 *     </Animated.View>
 *   );
 * }
 * ```
 */
export function useAmbientTransition(
  options?: AmbientTransitionOptions
): AmbientTransitionReturn {
  const {
    duration = AMBIENT_TIMING_CONFIGS.incandescent.duration,
    delay = 0,
    withGlowPulse = false,
    initialScale = 0.97,
  } = options || {};

  const opacity = useSharedValue(0);
  const scale = useSharedValue(initialScale);
  const glowOpacity = useSharedValue(0);

  const fadeIn = useCallback(() => {
    // Use setTimeout for reliable timing per CLAUDE.md rules
    setTimeout(() => {
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.sin), // Organic sine curve
      });
      scale.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.sin),
      });
    }, delay);

    // Optional glow pulse on settle
    if (withGlowPulse) {
      setTimeout(() => {
        glowOpacity.value = withTiming(0.3, {
          duration: AMBIENT_TIMING_CONFIGS.glowPulse.duration / 2,
        });
        setTimeout(() => {
          glowOpacity.value = withTiming(0, {
            duration: AMBIENT_TIMING_CONFIGS.glowPulse.duration / 2,
          });
        }, AMBIENT_TIMING_CONFIGS.glowPulse.duration / 2);
      }, delay + duration - 100);
    }
  }, [delay, duration, withGlowPulse, opacity, scale, glowOpacity]);

  const fadeOut = useCallback(() => {
    opacity.value = withTiming(0, {
      duration: duration * 0.7, // Fade out slightly faster
      easing: Easing.in(Easing.sin),
    });
    scale.value = withTiming(initialScale, {
      duration: duration * 0.7,
      easing: Easing.in(Easing.sin),
    });
  }, [duration, initialScale, opacity, scale]);

  const reset = useCallback(() => {
    opacity.value = 0;
    scale.value = initialScale;
    glowOpacity.value = 0;
  }, [initialScale, opacity, scale, glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return {
    fadeIn,
    fadeOut,
    reset,
    animatedStyle,
    glowOpacity,
  };
}

export default useAmbientTransition;
