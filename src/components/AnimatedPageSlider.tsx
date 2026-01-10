import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme';
import { TacticalText } from './titan/TacticalText';
import { MicroLabel } from './titan/MicroLabel';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_PADDING = 40;
const TRACK_HEIGHT = 4; // Thinner track for precision look
const THUMB_SIZE = 24; // Smaller thumb

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

  // Haptic feedback wrappers (must use runOnJS from worklet)
  const hapticLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const hapticMedium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const hapticHeavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

  // Throttled haptic feedback
  const triggerHaptic = (newValue: number) => {
    const milestones = [100, 250, 500, 750, 1000];

    if (Math.abs(newValue - lastHapticValue.current) >= 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastHapticValue.current = newValue;
    }

    if (milestones.includes(newValue) && !milestones.includes(lastHapticValue.current)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    onValueChange(newValue);
  };

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isActive.value = true;
      scale.value = withSpring(1.1, { damping: 10, stiffness: 300 });
      runOnJS(hapticMedium)();
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
      runOnJS(hapticLight)();
    });

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    borderColor: isActive.value ? colors.signal.active : colors.border.subtle,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    backgroundColor: isActive.value ? colors.signal.active : colors.text.primary,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Value Display */}
      <View style={styles.valueContainer}>
        <TacticalText size={42} weight="bold" color={colors.text.primary}>
          {Math.max(minValue, Math.min(maxValue, value))}
        </TacticalText>
        <MicroLabel style={{ marginTop: 8 }}>PAGES</MicroLabel>
      </View>

      {/* Slider Track */}
      <View style={styles.sliderContainer}>
        {/* Background Track with tick marks */}
        <View style={[styles.track, { width: TRACK_WIDTH + THUMB_SIZE }]}>
           {/* Render some tick marks for tactical look */}
           {Array.from({ length: 11 }).map((_, i) => (
             <View 
                key={i} 
                style={[
                    styles.tick, 
                    { left: `${i * 10}%`, height: i % 5 === 0 ? 8 : 4 }
                ]} 
             />
           ))}
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </GestureDetector>
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <TacticalText size={10} color={colors.text.muted}>{minValue}</TacticalText>
        <TacticalText size={10} color={colors.text.muted}>{maxValue}</TacticalText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 2, // Sharp corners
    padding: 24,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sliderContainer: {
    height: 24, // Enough for ticks
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: '#333', // Dark grey track
    borderRadius: 0,
    overflow: 'visible', // Visible ticks
    justifyContent: 'center',
  },
  tick: {
      position: 'absolute',
      width: 1,
      backgroundColor: '#555',
      top: -2,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.signal.active, // Always Neon Red
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE, // Square
    borderRadius: 0, // Sharp square
    backgroundColor: colors.text.primary, // White square
    borderWidth: 1,
    borderColor: '#000',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});