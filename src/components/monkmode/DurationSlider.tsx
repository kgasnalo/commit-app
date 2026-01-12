/**
 * DurationSlider Component
 * Phase 4.3 - Monk Mode Duration Selection
 *
 * A horizontal slider for selecting reading session duration (5-120 minutes).
 * Features haptic feedback at milestone durations.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HapticsService } from '../../lib/HapticsService';
import { colors } from '../../theme/colors';
import { SPRING_CONFIGS, TIMING_CONFIGS } from '../../config/animation';
import i18n from '../../i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 32;
const TRACK_HEIGHT = 8;
const THUMB_SIZE = 32;
const TRACK_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const SLIDE_RANGE = TRACK_WIDTH - THUMB_SIZE;

// Duration presets for labels (5 minute increments from 5 to 120)
const MIN_DURATION = 5;
const MAX_DURATION = 120;
const STEP = 5;

// Milestones that trigger heavier haptic
const MILESTONES = [15, 30, 45, 60, 90, 120];

interface DurationSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

export default function DurationSlider({
  value,
  onValueChange,
}: DurationSliderProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const startX = useSharedValue(0);
  const lastHapticValue = useSharedValue(value);

  // Convert duration to position
  const durationToPosition = useCallback((duration: number): number => {
    const normalized = (duration - MIN_DURATION) / (MAX_DURATION - MIN_DURATION);
    return normalized * SLIDE_RANGE;
  }, []);

  // Convert position to duration (snapped to STEP)
  const positionToDuration = useCallback((position: number): number => {
    const normalized = position / SLIDE_RANGE;
    const rawDuration = MIN_DURATION + normalized * (MAX_DURATION - MIN_DURATION);
    // Snap to nearest STEP
    const snapped = Math.round(rawDuration / STEP) * STEP;
    return Math.max(MIN_DURATION, Math.min(MAX_DURATION, snapped));
  }, []);

  // Initialize position from value
  useEffect(() => {
    if (!isDragging.value) {
      const targetPosition = durationToPosition(value);
      translateX.value = withTiming(targetPosition, TIMING_CONFIGS.standard);
    }
  }, [value, durationToPosition]);

  // Derived progress value (0-1)
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

  const triggerHeavyHaptic = useCallback(() => {
    HapticsService.feedbackHeavy();
  }, []);

  const handleValueChange = useCallback(
    (newValue: number) => {
      onValueChange(newValue);
    },
    [onValueChange]
  );

  // Check if value is a milestone and trigger appropriate haptic
  const checkMilestoneHaptic = useCallback(
    (newValue: number) => {
      if (MILESTONES.includes(newValue) && newValue !== lastHapticValue.value) {
        triggerHeavyHaptic();
      } else if (newValue !== lastHapticValue.value) {
        triggerLightHaptic();
      }
      lastHapticValue.value = newValue;
    },
    [triggerHeavyHaptic, triggerLightHaptic]
  );

  // Snap to nearest step
  const snapToNearest = useCallback(
    (currentTranslateX: number) => {
      const duration = positionToDuration(currentTranslateX);
      const snappedPosition = durationToPosition(duration);
      translateX.value = withSpring(snappedPosition, SPRING_CONFIGS.snappy);
      triggerMediumHaptic();
      handleValueChange(duration);
    },
    [positionToDuration, durationToPosition, triggerMediumHaptic, handleValueChange]
  );

  // Pan gesture handler
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          isDragging.value = true;
          startX.value = translateX.value;
          scale.value = withSpring(1.15, SPRING_CONFIGS.snappy);
          runOnJS(triggerLightHaptic)();
        })
        .onUpdate((event) => {
          const newX = Math.max(0, Math.min(SLIDE_RANGE, startX.value + event.translationX));
          translateX.value = newX;

          // Calculate current duration and trigger haptic
          const currentDuration = Math.round(
            (MIN_DURATION + (newX / SLIDE_RANGE) * (MAX_DURATION - MIN_DURATION)) / STEP
          ) * STEP;
          runOnJS(checkMilestoneHaptic)(currentDuration);
        })
        .onEnd(() => {
          isDragging.value = false;
          scale.value = withSpring(1, SPRING_CONFIGS.snappy);
          runOnJS(snapToNearest)(translateX.value);
        }),
    [snapToNearest, checkMilestoneHaptic]
  );

  // Animated styles
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  // Display labels
  const labels = [5, 30, 60, 90, 120];

  return (
    <View style={styles.container}>
      {/* Duration Display */}
      <View style={styles.durationDisplayContainer}>
        <Text style={styles.durationDisplay}>
          {value}
        </Text>
        <Text style={styles.durationUnit}>
          {i18n.t('monkmode.minutes_unit')}
        </Text>
      </View>

      {/* Slider Track */}
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          {/* Fill */}
          <Animated.View style={[styles.fill, fillStyle]} />

          {/* Thumb */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.thumb, thumbStyle]}>
              <View style={styles.thumbInner} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        {labels.map((labelValue, index) => {
          const isSelected = value === labelValue;
          const isFirst = index === 0;
          const isLast = index === labels.length - 1;
          return (
            <Text
              key={labelValue}
              style={[
                styles.label,
                isFirst && styles.labelFirst,
                isLast && styles.labelLast,
                isSelected && styles.labelSelected,
              ]}
            >
              {labelValue}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TRACK_WIDTH,
    alignSelf: 'center',
  },
  // Giant glowing duration display
  durationDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 4,
  },
  durationDisplay: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: -3,
    // Strong glow effect
    textShadowColor: 'rgba(255, 107, 53, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 24,
  },
  durationUnit: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255, 160, 120, 0.5)',
  },
  trackContainer: {
    height: THUMB_SIZE + 20,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  // Dark track with subtle inner glow
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: 'rgba(20, 18, 16, 0.9)',
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'visible',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Orange fill with gradient effect
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FF6B35',
    borderRadius: TRACK_HEIGHT / 2,
    // Subtle glow on the fill
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  // Glowing energy sphere thumb
  thumb: {
    position: 'absolute',
    left: -THUMB_SIZE / 2,
    top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Strong energy glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  // Inner bright core of energy sphere
  thumbInner: {
    width: THUMB_SIZE * 0.45,
    height: THUMB_SIZE * 0.45,
    borderRadius: THUMB_SIZE * 0.225,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    // Inner glow
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
  },
  labelFirst: {
    textAlign: 'left',
  },
  labelLast: {
    textAlign: 'right',
  },
  labelSelected: {
    color: '#FF6B35',
    fontWeight: '700',
    // Subtle glow on selected label
    textShadowColor: 'rgba(255, 107, 53, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
