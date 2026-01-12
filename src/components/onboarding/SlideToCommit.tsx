/**
 * SlideToCommit Component
 * Phase 2.3.2 - The Slider Commit (Screen 13)
 *
 * A high-stakes slide gesture for contract signing.
 * Features progressive "engine revving" haptics and gold/white theme.
 * Based on SlideToBegin pattern with enhanced feedback.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { HapticsService } from '../../lib/HapticsService';
import { colors, typography, spacing } from '../../theme';
import { SPRING_CONFIGS, ACT_THEMES } from '../../config/animation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRACK_PADDING = spacing.lg * 2;
const TRACK_HEIGHT = 64;
const THUMB_SIZE = 56;
const TRACK_WIDTH = SCREEN_WIDTH - TRACK_PADDING;
const SLIDE_RANGE = TRACK_WIDTH - THUMB_SIZE - 8;

const COMPLETION_THRESHOLD = 0.9;

// Act 3 Gold theme
const GOLD = ACT_THEMES.act3.accent;
const GOLD_LIGHT = '#FFFACD';

interface SlideToCommitProps {
  onComplete: () => void;
  loading?: boolean;
  disabled?: boolean;
  label: string;
  completedLabel?: string;
}

export default function SlideToCommit({
  onComplete,
  loading = false,
  disabled = false,
  label,
  completedLabel,
}: SlideToCommitProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const isCompleted = useSharedValue(false);

  // Track last haptic time for progressive feedback
  const lastHapticTimeRef = useRef(0);

  // Reset slider state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      translateX.value = 0;
      scale.value = 1;
      isCompleted.value = false;
      lastHapticTimeRef.current = 0;
    }, [])
  );

  // Derived progress value (safe for render)
  const progress = useDerivedValue(() => {
    return Math.min(1, Math.max(0, translateX.value / SLIDE_RANGE));
  });

  // Haptic feedback with progressive intensity (revving engine effect)
  const triggerProgressiveHaptic = useCallback((currentProgress: number) => {
    const now = Date.now();

    // Calculate haptic interval based on progress (faster as user gets closer)
    // 0% = 80ms, 100% = 30ms
    const interval = 80 - (currentProgress * 50);

    if (now - lastHapticTimeRef.current < interval) return;
    lastHapticTimeRef.current = now;

    // Progressive haptic style
    if (currentProgress < 0.25) {
      HapticsService.feedbackLight();
    } else if (currentProgress < 0.5) {
      HapticsService.feedbackLight();
    } else if (currentProgress < 0.75) {
      HapticsService.feedbackMedium();
    } else {
      HapticsService.feedbackHeavy();
    }
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    HapticsService.feedbackSuccess();
  }, []);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Pan gesture handler
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          if (isCompleted.value || disabled || loading) return;
          scale.value = withSpring(1.05, SPRING_CONFIGS.snappy);
        })
        .onUpdate((event) => {
          if (isCompleted.value || disabled || loading) return;
          const newX = Math.max(0, Math.min(SLIDE_RANGE, event.translationX));
          translateX.value = newX;

          // Progressive haptic feedback (revving engine)
          const currentProgress = newX / SLIDE_RANGE;
          runOnJS(triggerProgressiveHaptic)(currentProgress);
        })
        .onEnd(() => {
          if (isCompleted.value || disabled || loading) return;
          const currentProgress = translateX.value / SLIDE_RANGE;

          if (currentProgress >= COMPLETION_THRESHOLD) {
            // Complete!
            isCompleted.value = true;
            translateX.value = withSpring(SLIDE_RANGE, SPRING_CONFIGS.snappy);
            scale.value = withSpring(1.15, SPRING_CONFIGS.bouncy);
            runOnJS(triggerSuccessHaptic)();
            runOnJS(handleComplete)();
          } else {
            // Reset
            translateX.value = withSpring(0, SPRING_CONFIGS.smooth);
            scale.value = withSpring(1, SPRING_CONFIGS.snappy);
          }
        }),
    [disabled, loading]
  );

  // Animated styles
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  // Gold fill that intensifies with progress
  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2 + 4,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [GOLD + '30', GOLD + '70', GOLD]
    ),
  }));

  const labelOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
  }));

  const containerOpacityStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.5 : 1,
  }));

  // Arrow transitions to document/checkmark
  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0.5, 0]),
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [0, 1]),
    transform: [
      { scale: interpolate(progress.value, [0.8, 1], [0.5, 1]) },
    ],
  }));

  // Track glow effect based on progress
  const trackGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.6]),
    shadowRadius: interpolate(progress.value, [0, 1], [0, 15]),
  }));

  return (
    <Animated.View style={[styles.container, containerOpacityStyle]}>
      <Animated.View style={[styles.track, trackGlowStyle]}>
        {/* Fill progress */}
        <Animated.View style={[styles.fill, fillStyle]} />

        {/* Label */}
        <Animated.Text style={[styles.label, labelOpacityStyle]}>
          {loading ? '' : label}
        </Animated.Text>

        {/* Loading indicator when processing */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={GOLD} size="small" />
          </View>
        )}

        {/* Thumb */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.thumb, thumbStyle]}>
            {loading ? (
              <ActivityIndicator color={colors.text.primary} size="small" />
            ) : (
              <>
                <Animated.View style={arrowAnimatedStyle}>
                  <Ionicons name="document-text" size={22} color={colors.text.primary} />
                </Animated.View>
                <Animated.View style={[styles.checkIcon, checkAnimatedStyle]}>
                  <Ionicons name="checkmark" size={24} color={colors.text.primary} />
                </Animated.View>
              </>
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TRACK_WIDTH,
    alignSelf: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.background.secondary,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    borderColor: GOLD + '40',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 4,
    // Shadow for glow effect
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: typography.fontSize.body,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  loadingContainer: {
    position: 'absolute',
    alignSelf: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  checkIcon: {
    position: 'absolute',
  },
});
