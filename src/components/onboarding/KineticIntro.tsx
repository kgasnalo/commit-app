/**
 * KineticIntro Component
 * Phase 2.1.1 - Screen 0 animated text sequence
 *
 * Displays sophisticated "Asset" concept typography:
 * Line 1: "知識は、読み切ってこそ" (White)
 * Line 2: "資産になる。" with "資産" highlighted in Gold
 * Subtitle: "買った本を、飾りで終わらせない。"
 *
 * NOTE: Layout animations (entering) and transform styles are separated
 * to avoid Reanimated warnings about property overwrites.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SPRING_CONFIGS, TIMING_CONFIGS } from '../../config/animation';
import i18n from '../../i18n';

// High-end typography colors
const COLORS = {
  white: '#FFFFFF',
  gold: '#FFC107',
  lightGray: '#E5E5E5',
};

interface KineticIntroProps {
  onAnimationComplete: () => void;
}

type AnimationPhase = 'waiting' | 'line1' | 'pause' | 'line2' | 'subtitle' | 'complete';

export default function KineticIntro({ onAnimationComplete }: KineticIntroProps) {
  const [phase, setPhase] = useState<AnimationPhase>('waiting');

  // Animation values for additional effects
  const line1Scale = useSharedValue(0.9);
  const line2Scale = useSharedValue(0.9);

  // Trigger haptic feedback
  const triggerHeavyHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const triggerSuccessHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Start animation sequence on mount
  useEffect(() => {
    // Phase 1: Show Line 1 after brief delay
    const phase1Timer = setTimeout(() => {
      setPhase('line1');
      triggerHeavyHaptic();
      line1Scale.value = withSpring(1, SPRING_CONFIGS.heavy);
    }, 400);

    // Phase 2: Pause
    const phase2Timer = setTimeout(() => {
      setPhase('pause');
    }, 1400);

    // Phase 3: Show Line 2 with "資産" highlight
    const phase3Timer = setTimeout(() => {
      setPhase('line2');
      triggerHeavyHaptic();
      line2Scale.value = withSpring(1, SPRING_CONFIGS.heavy);
    }, 2000);

    // Phase 4: Show subtitle
    const phase4Timer = setTimeout(() => {
      setPhase('subtitle');
    }, 3000);

    // Phase 5: Animation complete
    const phase5Timer = setTimeout(() => {
      setPhase('complete');
      triggerSuccessHaptic();
      onAnimationComplete();
    }, 3800);

    return () => {
      clearTimeout(phase1Timer);
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      clearTimeout(phase4Timer);
      clearTimeout(phase5Timer);
    };
  }, [onAnimationComplete]);

  // Animated styles - applied to inner elements (not the entering container)
  const line1ScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: line1Scale.value }],
  }));

  const line2ScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: line2Scale.value }],
  }));

  const showLine1 = phase !== 'waiting';
  const showLine2 = phase === 'line2' || phase === 'subtitle' || phase === 'complete';
  const showSubtitle = phase === 'subtitle' || phase === 'complete';

  return (
    <View style={styles.container}>
      {/* Line 1: "知識は、読み切ってこそ" */}
      {/* Three-layer pattern: Outer (entering) -> Middle (transform) -> Inner (Text) */}
      {showLine1 && (
        <Animated.View
          entering={FadeInUp.duration(TIMING_CONFIGS.cinematic.duration).springify()}
        >
          <Animated.View style={line1ScaleStyle}>
            <Text style={styles.line1}>
              {i18n.t('welcome.kinetic_line1')}
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Line 2: "資産になる。" with "資産" in Gold */}
      {/* Parent: Layout animation (entering), Child: Transform animation (scale) */}
      {showLine2 && (
        <Animated.View
          entering={FadeInDown.duration(TIMING_CONFIGS.cinematic.duration).springify()}
        >
          <Animated.View style={line2ScaleStyle}>
            <Text style={styles.line2Container}>
              <Text style={styles.assetHighlight}>
                {i18n.t('welcome.kinetic_asset')}
              </Text>
              <Text style={styles.line2Suffix}>
                {i18n.t('welcome.kinetic_suffix')}
              </Text>
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Subtitle: "買った本を、飾りで終わらせない。" */}
      {/* Only layout animation, no transform needed */}
      {showSubtitle && (
        <Animated.Text
          entering={FadeIn.duration(400)}
          style={styles.subtitle}
        >
          {i18n.t('welcome.kinetic_subtitle')}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  line1: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  line2Container: {
    textAlign: 'center',
    marginBottom: 20,
  },
  assetHighlight: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 1,
  },
  line2Suffix: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.lightGray,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 8,
  },
});
