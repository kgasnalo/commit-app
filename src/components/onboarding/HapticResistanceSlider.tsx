/**
 * HapticResistanceSlider Component
 * Phase 2.2.1 - Screen 5 Penalty Slider with Progressive Haptic Feedback
 *
 * A horizontal slider that feels "harder" to push as the amount increases.
 * Haptic feedback density increases with progress (10% interval → 1% interval).
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { SPRING_CONFIGS, TIMING_CONFIGS, ACT_THEMES } from '../../config/animation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 24;
const TRACK_HEIGHT = 10;
const THUMB_SIZE = 36;
const TRACK_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const SLIDE_RANGE = TRACK_WIDTH - THUMB_SIZE;

// Minimum time between haptic triggers (ms)
const HAPTIC_DEBOUNCE = 50;

type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW';

interface PresetAmount {
  value: number;
  label: string;
}

interface HapticResistanceSliderProps {
  presets: PresetAmount[];
  currency: Currency;
  selectedValue: number | null;
  onValueChange: (value: number) => void;
  onIntensityChange?: (intensity: number) => void;
}

export default function HapticResistanceSlider({
  presets,
  currency,
  selectedValue,
  onValueChange,
  onIntensityChange,
}: HapticResistanceSliderProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastHapticTime = useSharedValue(0);
  const lastHapticProgress = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startX = useSharedValue(0); // Gesture start position

  const presetCount = presets.length;

  // Convert preset index to position (index-based, not value-based)
  const indexToPosition = useCallback(
    (index: number): number => {
      if (presetCount <= 1) return 0;
      return (index / (presetCount - 1)) * SLIDE_RANGE;
    },
    [presetCount]
  );

  // Convert position to nearest preset index
  const positionToIndex = useCallback(
    (position: number): number => {
      if (presetCount <= 1) return 0;
      const rawIndex = (position / SLIDE_RANGE) * (presetCount - 1);
      return Math.round(Math.max(0, Math.min(presetCount - 1, rawIndex)));
    },
    [presetCount]
  );

  // Find preset index by value
  const findPresetIndex = useCallback(
    (value: number): number => {
      const index = presets.findIndex((p) => p.value === value);
      return index >= 0 ? index : 0;
    },
    [presets]
  );

  // Calculate initial position from selectedValue
  useEffect(() => {
    if (selectedValue !== null && !isDragging.value) {
      const index = findPresetIndex(selectedValue);
      const targetPosition = indexToPosition(index);
      translateX.value = withTiming(targetPosition, TIMING_CONFIGS.standard);
    }
  }, [selectedValue, findPresetIndex, indexToPosition]);

  // Derived progress value (0-1)
  const progress = useDerivedValue(() => {
    return Math.min(1, Math.max(0, translateX.value / SLIDE_RANGE));
  });

  // Haptic feedback functions
  const triggerLightHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const triggerMediumHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const triggerHeavyHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const triggerSelectionHaptic = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  // Progressive haptic based on current progress
  const triggerProgressiveHaptic = useCallback(
    (currentProgress: number) => {
      // Higher progress = heavier haptic
      if (currentProgress < 0.33) {
        triggerLightHaptic();
      } else if (currentProgress < 0.66) {
        triggerMediumHaptic();
      } else {
        triggerHeavyHaptic();
      }
    },
    [triggerLightHaptic, triggerMediumHaptic, triggerHeavyHaptic]
  );

  // Calculate haptic interval based on progress
  // At 0%: haptic every 10% movement
  // At 100%: haptic every 1% movement (10x more frequent)
  const calculateHapticInterval = (currentProgress: number): number => {
    'worklet';
    const baseInterval = 0.1; // 10% at start
    const minInterval = 0.01; // 1% at end
    return baseInterval - currentProgress * (baseInterval - minInterval);
  };

  const handleValueChange = useCallback(
    (value: number) => {
      onValueChange(value);
    },
    [onValueChange]
  );

  const handleIntensityChange = useCallback(
    (intensity: number) => {
      onIntensityChange?.(intensity);
    },
    [onIntensityChange]
  );

  // Snap to nearest preset (called from JS thread via runOnJS)
  const snapToNearest = useCallback(
    (currentTranslateX: number) => {
      const nearestIndex = positionToIndex(currentTranslateX);
      const snappedPosition = indexToPosition(nearestIndex);
      const nearestValue = presets[nearestIndex]?.value ?? 0;

      translateX.value = withSpring(snappedPosition, SPRING_CONFIGS.heavy);
      triggerHeavyHaptic();
      handleValueChange(nearestValue);
    },
    [positionToIndex, indexToPosition, presets, triggerHeavyHaptic, handleValueChange]
  );

  // Pan gesture handler
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          isDragging.value = true;
          startX.value = translateX.value; // Save current position
          scale.value = withSpring(1.2, SPRING_CONFIGS.snappy);
          runOnJS(triggerSelectionHaptic)();
        })
        .onUpdate((event) => {
          const newX = Math.max(0, Math.min(SLIDE_RANGE, startX.value + event.translationX));
          translateX.value = newX;

          const currentProgress = newX / SLIDE_RANGE;
          const interval = calculateHapticInterval(currentProgress);
          const now = Date.now();

          // Check if we should trigger haptic
          if (
            Math.abs(currentProgress - lastHapticProgress.value) > interval &&
            now - lastHapticTime.value > HAPTIC_DEBOUNCE
          ) {
            runOnJS(triggerProgressiveHaptic)(currentProgress);
            lastHapticProgress.value = currentProgress;
            lastHapticTime.value = now;
          }

          // Update intensity for vignette
          runOnJS(handleIntensityChange)(currentProgress);
        })
        .onEnd(() => {
          isDragging.value = false;
          scale.value = withSpring(1, SPRING_CONFIGS.snappy);
          runOnJS(snapToNearest)(translateX.value);
        }),
    [snapToNearest]
  );

  // Animated styles
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [ACT_THEMES.act2.orbColors[3], ACT_THEMES.act2.orbColors[1], ACT_THEMES.act2.accent]
    ),
  }));

  const thumbColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [ACT_THEMES.act2.orbColors[2], ACT_THEMES.act2.orbColors[1], '#FF2222']
    ),
    shadowColor: interpolateColor(
      progress.value,
      [0, 1],
      ['#800000', '#FF0000']
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.2, 0.5, 0.8]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.5]) }],
  }));

  // Amount display
  const formatAmount = (amount: number): string => {
    const symbols: Record<Currency, string> = {
      JPY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      KRW: '₩',
    };
    const symbol = symbols[currency];

    if (currency === 'JPY' || currency === 'KRW') {
      return `${symbol}${amount.toLocaleString()}`;
    }
    return `${symbol}${amount}`;
  };

  // Format label with full comma separation (e.g., "¥1,000", "¥10,000")
  const formatLabel = (amount: number): string => {
    const symbols: Record<Currency, string> = {
      JPY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      KRW: '₩',
    };
    const symbol = symbols[currency];

    if (amount === 0) return `${symbol}0`;

    if (currency === 'JPY' || currency === 'KRW') {
      return `${symbol}${amount.toLocaleString()}`;
    }
    return `${symbol}${amount}`;
  };

  return (
    <View style={styles.container}>
      {/* Current Amount Display */}
      <View style={styles.amountDisplayContainer}>
        <Animated.Text
          style={[styles.amountDisplay]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {selectedValue !== null ? formatAmount(selectedValue) : '---'}
        </Animated.Text>
      </View>

      {/* Slider Track */}
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          {/* Glow effect */}
          <Animated.View style={[styles.glow, glowStyle]} />

          {/* Fill */}
          <Animated.View style={[styles.fill, fillStyle]} />

          {/* Thumb */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.thumb, thumbStyle, thumbColorStyle]}>
              <View style={styles.thumbInner} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      {/* Preset Labels - Flexbox layout for even distribution */}
      <View style={styles.labelsContainer}>
        {presets.map((preset, index) => {
          const isSelected = selectedValue === preset.value;
          const isFirst = index === 0;
          const isLast = index === presets.length - 1;
          return (
            <Text
              key={preset.value}
              style={[
                styles.presetLabel,
                isFirst && styles.presetLabelFirst,
                isLast && styles.presetLabelLast,
                isSelected && styles.presetLabelSelected,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatLabel(preset.value)}
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
    paddingVertical: 16,
  },
  amountDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountDisplay: {
    fontSize: 52,
    fontWeight: '700',
    color: ACT_THEMES.act2.orbColors[1],
    textShadowColor: ACT_THEMES.act2.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    letterSpacing: -1,
  },
  trackContainer: {
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    bottom: -8,
    backgroundColor: ACT_THEMES.act2.accent,
    borderRadius: TRACK_HEIGHT + 4,
    opacity: 0.15,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    left: -THUMB_SIZE / 2,
    top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  thumbInner: {
    width: THUMB_SIZE * 0.35,
    height: THUMB_SIZE * 0.35,
    borderRadius: THUMB_SIZE * 0.175,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 0,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
  },
  presetLabelFirst: {
    textAlign: 'left',
    minWidth: 40,
  },
  presetLabelLast: {
    textAlign: 'right',
    minWidth: 40,
  },
  presetLabelSelected: {
    color: ACT_THEMES.act2.orbColors[1],
    fontWeight: '700',
  },
});
