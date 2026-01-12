/**
 * SlideToBegin Component
 * Phase 2.1.1 - Screen 0 slide gesture CTA
 *
 * A horizontal swipe track that user slides to activate.
 * Provides progressive visual feedback and haptics.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
import { colors, typography, borderRadius, spacing } from '../../theme';
import { SPRING_CONFIGS, TIMING_CONFIGS } from '../../config/animation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRACK_PADDING = spacing.lg * 2;
const TRACK_HEIGHT = 64;
const THUMB_SIZE = 56;
const TRACK_WIDTH = SCREEN_WIDTH - TRACK_PADDING;
const SLIDE_RANGE = TRACK_WIDTH - THUMB_SIZE - 8; // 8 = internal padding

const COMPLETION_THRESHOLD = 0.9; // 90% to trigger completion

interface SlideToBeginProps {
  onComplete: () => void;
  disabled?: boolean;
  label: string;
}

export default function SlideToBegin({
  onComplete,
  disabled = false,
  label,
}: SlideToBeginProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const isCompleted = useSharedValue(false);

  // Reset slider state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset values immediately
      translateX.value = 0;
      scale.value = 1;
      isCompleted.value = false;
    }, [])
  );

  // Derived progress value (safe for render)
  const progress = useDerivedValue(() => {
    return Math.min(1, Math.max(0, translateX.value / SLIDE_RANGE));
  });

  // Haptic feedback functions
  const triggerLightHaptic = useCallback(() => {
    HapticsService.feedbackLight();
  }, []);

  const triggerMediumHaptic = useCallback(() => {
    HapticsService.feedbackMedium();
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    HapticsService.feedbackSuccess();
  }, []);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Pan gesture handler - check isCompleted inside callbacks to avoid render-phase read
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          // Check completion/disabled state inside worklet
          if (isCompleted.value || disabled) return;
          scale.value = withSpring(1.05, SPRING_CONFIGS.snappy);
          runOnJS(triggerLightHaptic)();
        })
        .onUpdate((event) => {
          if (isCompleted.value || disabled) return;
          const newX = Math.max(0, Math.min(SLIDE_RANGE, event.translationX));
          translateX.value = newX;

          // Haptic at milestones
          const currentProgress = newX / SLIDE_RANGE;
          if (currentProgress > 0.25 && currentProgress < 0.3) {
            runOnJS(triggerLightHaptic)();
          }
          if (currentProgress > 0.5 && currentProgress < 0.55) {
            runOnJS(triggerMediumHaptic)();
          }
          if (currentProgress > 0.75 && currentProgress < 0.8) {
            runOnJS(triggerMediumHaptic)();
          }
        })
        .onEnd(() => {
          if (isCompleted.value || disabled) return;
          const currentProgress = translateX.value / SLIDE_RANGE;

          if (currentProgress >= COMPLETION_THRESHOLD) {
            // Complete!
            isCompleted.value = true;
            translateX.value = withSpring(SLIDE_RANGE, SPRING_CONFIGS.snappy);
            scale.value = withSpring(1.1, SPRING_CONFIGS.bouncy);
            runOnJS(triggerSuccessHaptic)();
            runOnJS(handleComplete)();
          } else {
            // Reset
            translateX.value = withSpring(0, SPRING_CONFIGS.smooth);
            scale.value = withSpring(1, SPRING_CONFIGS.snappy);
          }
        }),
    [disabled]
  );

  // Animated styles
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2 + 4,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [colors.accent.primary + '40', colors.accent.primary + '80', colors.accent.primary]
    ),
  }));

  const labelOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
  }));

  const containerOpacityStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.5 : 1,
  }));

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0.5, 0]),
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [0, 1]),
    transform: [
      { scale: interpolate(progress.value, [0.8, 1], [0.5, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerOpacityStyle]}>
      <View style={styles.track}>
        {/* Fill progress */}
        <Animated.View style={[styles.fill, fillStyle]} />

        {/* Label */}
        <Animated.Text style={[styles.label, labelOpacityStyle]}>
          {label}
        </Animated.Text>

        {/* Thumb */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.thumb, thumbStyle]}>
            <Animated.View style={arrowAnimatedStyle}>
              <Ionicons name="arrow-forward" size={24} color={colors.text.primary} />
            </Animated.View>
            <Animated.View style={[styles.checkIcon, checkAnimatedStyle]}>
              <Ionicons name="checkmark" size={24} color={colors.text.primary} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
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
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 4,
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
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  checkIcon: {
    position: 'absolute',
  },
});
