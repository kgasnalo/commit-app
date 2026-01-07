import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_PADDING = 40;
const TRACK_HEIGHT = 8;
const THUMB_SIZE = 32;

interface AnimatedPageSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
}

export default function AnimatedPageSlider({
  value,
  onValueChange,
  minValue = 1,
  maxValue = 1000,
}: AnimatedPageSliderProps) {
  const TRACK_WIDTH = SCREEN_WIDTH - (SLIDER_PADDING * 2) - THUMB_SIZE;

  // Shared values for animations
  const translateX = useSharedValue(0);
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const isActive = useSharedValue(false);

  const lastHapticValue = useRef(value);

  // Sync value when minValue or value changes
  useEffect(() => {
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    const normalizedProgress = (clampedValue - minValue) / (maxValue - minValue);
    const newX = normalizedProgress * TRACK_WIDTH;
    translateX.value = newX;
    progress.value = normalizedProgress;
  }, [value, minValue, maxValue, TRACK_WIDTH]);

  // Throttled haptic feedback
  const triggerHaptic = (newValue: number) => {
    const milestones = [100, 250, 500, 750, 1000];

    if (Math.abs(newValue - lastHapticValue.current) >= 25) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticValue.current = newValue;
    }

    if (milestones.includes(newValue) && !milestones.includes(lastHapticValue.current)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onValueChange(newValue);
  };

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isActive.value = true;
      scale.value = withSpring(1.3, { damping: 10, stiffness: 300 });
    })
    .onUpdate((event) => {
      const startX = ((value - minValue) / (maxValue - minValue)) * TRACK_WIDTH;
      const newX = Math.max(0, Math.min(TRACK_WIDTH, startX + event.translationX));
      translateX.value = newX;
      progress.value = newX / TRACK_WIDTH;

      const newValue = Math.round(
        interpolate(newX, [0, TRACK_WIDTH], [minValue, maxValue])
      );

      runOnJS(triggerHaptic)(newValue);
    })
    .onEnd(() => {
      isActive.value = false;
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      ['#FFFFFF', '#F0F0F0', '#FFE8E8']
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.7, 1],
      ['#4CAF50', '#FFC107', '#F44336']
    ),
  }));

  const textScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isActive.value ? 1.2 : 1, { damping: 10, stiffness: 300 }) }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Value Display */}
      <Animated.View style={[styles.valueContainer, textScaleStyle]}>
        <Text style={styles.valueText}>
          {Math.max(minValue, Math.min(maxValue, value))}
        </Text>
        <Text style={styles.valueLabel}>pages</Text>
      </Animated.View>

      {/* Slider Track */}
      <View style={styles.sliderContainer}>
        <View style={[styles.track, { width: TRACK_WIDTH + THUMB_SIZE }]}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </GestureDetector>
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <Text style={styles.label}>{minValue}</Text>
        <Text style={styles.label}>{maxValue}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  valueText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#000',
  },
  valueLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  sliderContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: '#E0E0E0',
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: '#999',
  },
});
