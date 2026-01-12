/**
 * CinematicCommitReveal Component
 * Phase 2.3.3 - "007-Style" Mission Start Sequence
 *
 * A dramatic cinematic experience upon subscription completion:
 * Phase 1: The Shutdown (Blackout)
 * Phase 2: The Reveal (COMMIT text fades in)
 * Phase 3: The Transition (Dissolve to Dashboard)
 *
 * Uses React Native Animated for reliable cross-platform rendering.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';

// ============================================
// Timing Configuration (Total: ~3.5 seconds)
// ============================================
const PHASE_1_BLACKOUT = 400;        // Fade to black
const PHASE_2_SILENCE = 500;         // Hold in darkness (tension)
const PHASE_2_TEXT_FADEIN = 800;     // Text fades in
const PHASE_2_HOLD = 1000;           // Text fully visible, glow effect
const PHASE_3_TEXT_FADEOUT = 500;    // Text fades out
const PHASE_3_HOLD_BLACK = 300;      // Brief hold in black before transition

// Total time text is visible (for slow zoom calculation)
const TEXT_VISIBLE_DURATION = PHASE_2_TEXT_FADEIN + PHASE_2_HOLD + PHASE_3_TEXT_FADEOUT;

const TOTAL_DURATION =
  PHASE_1_BLACKOUT +
  PHASE_2_SILENCE +
  PHASE_2_TEXT_FADEIN +
  PHASE_2_HOLD +
  PHASE_3_TEXT_FADEOUT +
  PHASE_3_HOLD_BLACK;

// ============================================
// Typography Configuration (Premium Branding)
// ============================================
const PREMIUM_FONT_FAMILY = Platform.select({
  ios: 'Futura-Bold',
  android: 'sans-serif-black',
  default: 'System',
});

// Slow zoom configuration
const ZOOM_START_SCALE = 1.0;
const ZOOM_END_SCALE = 1.05;

interface CinematicCommitRevealProps {
  visible: boolean;
  onComplete: () => void;
}

export default function CinematicCommitReveal({
  visible,
  onComplete,
}: CinematicCommitRevealProps) {
  // Phase tracking for debugging
  const [currentPhase, setCurrentPhase] = useState(0);

  // Animation values - start with explicit initial values
  const blackoutOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(ZOOM_START_SCALE);
  const glowOpacity = useSharedValue(0);

  // Haptic feedback
  const triggerShutdownHaptic = useCallback(() => {
    HapticsService.feedbackHeavy();
  }, []);

  const triggerRevealHaptic = useCallback(() => {
    HapticsService.feedbackSuccess();
  }, []);

  const triggerGlowHaptic = useCallback(() => {
    HapticsService.feedbackMedium();
  }, []);

  useEffect(() => {
    if (!visible) {
      // Reset all values
      blackoutOpacity.value = 0;
      textOpacity.value = 0;
      textScale.value = ZOOM_START_SCALE;
      glowOpacity.value = 0;
      setCurrentPhase(0);
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    // ============================================
    // Phase 1: The Shutdown (Blackout)
    // ============================================
    setCurrentPhase(1);
    blackoutOpacity.value = withTiming(1, {
      duration: PHASE_1_BLACKOUT,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });

    // Haptic at shutdown start
    timers.push(setTimeout(triggerShutdownHaptic, 100));

    // ============================================
    // Phase 2: The Reveal - Use setTimeout for reliability
    // ============================================
    const phase2Start = PHASE_1_BLACKOUT + PHASE_2_SILENCE;

    timers.push(setTimeout(() => {
      setCurrentPhase(2);

      // Text fades in
      textOpacity.value = withTiming(1, {
        duration: PHASE_2_TEXT_FADEIN,
        easing: Easing.out(Easing.cubic),
      });

      // Slow zoom: imperceptible movement from 1.0 to 1.05
      // Runs for the entire text visibility duration (fade in + hold + fade out)
      // Uses linear easing for smooth, cinematic feel
      textScale.value = withTiming(ZOOM_END_SCALE, {
        duration: TEXT_VISIBLE_DURATION,
        easing: Easing.linear,
      });
    }, phase2Start));

    // Haptic at text reveal midpoint
    timers.push(setTimeout(triggerRevealHaptic, phase2Start + PHASE_2_TEXT_FADEIN * 0.5));

    // ============================================
    // Phase 2.5: Glow Effect (during hold)
    // ============================================
    const glowStart = phase2Start + PHASE_2_TEXT_FADEIN;

    timers.push(setTimeout(() => {
      // Subtle pulse glow
      glowOpacity.value = withSequence(
        withTiming(0.8, {
          duration: PHASE_2_HOLD * 0.4,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0.4, {
          duration: PHASE_2_HOLD * 0.3,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0.6, {
          duration: PHASE_2_HOLD * 0.3,
          easing: Easing.out(Easing.quad),
        })
      );
    }, glowStart));

    // Haptic at glow peak
    timers.push(setTimeout(triggerGlowHaptic, glowStart + PHASE_2_HOLD * 0.3));

    // ============================================
    // Phase 3: Text Dissolve
    // ============================================
    const dissolveStart = glowStart + PHASE_2_HOLD;

    timers.push(setTimeout(() => {
      setCurrentPhase(3);

      textOpacity.value = withTiming(0, {
        duration: PHASE_3_TEXT_FADEOUT,
        easing: Easing.bezier(0.4, 0, 1, 1),
      });

      glowOpacity.value = withTiming(0, {
        duration: PHASE_3_TEXT_FADEOUT,
        easing: Easing.bezier(0.4, 0, 1, 1),
      });
    }, dissolveStart));

    // ============================================
    // Complete callback after all animations
    // ============================================
    timers.push(setTimeout(() => {
      setCurrentPhase(4);
      onComplete();
    }, TOTAL_DURATION));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [visible, onComplete]);

  // Animated styles
  const blackoutStyle = useAnimatedStyle(() => ({
    opacity: blackoutOpacity.value,
  }));

  const textContainerStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Layer 1: Black background (zIndex: 1) */}
      <Animated.View style={[styles.blackout, blackoutStyle]} />

      {/* Layer 2: Glow effect (zIndex: 100) */}
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <View style={styles.glowOuter} />
        <View style={styles.glowInner} />
      </Animated.View>

      {/* Layer 3: COMMIT text (zIndex: 9999) - MUST be on top */}
      <Animated.View style={[styles.textContainer, textContainerStyle]}>
        <Text style={styles.commitText}>COMMIT</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  blackout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1,
    elevation: 1,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  glowOuter: {
    position: 'absolute',
    width: 300,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },
  glowInner: {
    position: 'absolute',
    width: 200,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  commitText: {
    color: '#FFFFFF',
    fontSize: 52,
    fontFamily: PREMIUM_FONT_FAMILY,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    // Explicit text styling to prevent inheritance issues
    backgroundColor: 'transparent',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
});
