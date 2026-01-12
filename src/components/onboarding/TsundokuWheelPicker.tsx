/**
 * TsundokuWheelPicker Component
 * Phase 2.1.2 - Screen 1 Visual Weight Wheel Picker
 *
 * A vertical scroll wheel where the center-selected item is highlighted.
 * Font weight and size increase dynamically as the value increases.
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ViewToken } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  interpolate,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';
import { colors, typography, spacing } from '../../theme';
import { SPRING_CONFIGS } from '../../config/animation';
import i18n from '../../i18n';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ITEM_HEIGHT = 80;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TsundokuWheelPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
}

// Generate data items for the picker
const generateItems = (min: number, max: number): number[] => {
  const items: number[] = [];
  for (let i = min; i <= max; i++) {
    items.push(i);
  }
  return items;
};

// Get font weight based on value - increases as value gets higher
const getFontWeightForValue = (value: number): '400' | '500' | '600' | '700' | '800' | '900' => {
  if (value <= 10) return '400';
  if (value <= 20) return '500';
  if (value <= 30) return '600';
  if (value <= 50) return '700';
  if (value <= 75) return '800';
  return '900';
};

// Get font size based on value - increases as value gets higher
const getFontSizeForValue = (value: number): number => {
  if (value <= 10) return 32;
  if (value <= 20) return 38;
  if (value <= 30) return 44;
  if (value <= 50) return 52;
  if (value <= 75) return 60;
  return 68;
};

// Wheel Item Component
interface WheelItemProps {
  item: number;
  index: number;
  scrollY: SharedValue<number>;
  selectedValue: number;
}

function WheelItem({ item, index, scrollY, selectedValue }: WheelItemProps) {
  const suffix = i18n.t('onboarding.screen1_wheel_suffix');

  // All calculations moved inside worklet to avoid render-scope dependencies
  const animatedStyle = useAnimatedStyle(() => {
    // Calculate inputRange inside worklet for thread safety
    const center = index * ITEM_HEIGHT;
    const inputRange = [
      center - 2 * ITEM_HEIGHT,
      center - ITEM_HEIGHT,
      center,
      center + ITEM_HEIGHT,
      center + 2 * ITEM_HEIGHT,
    ];

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [0.6, 0.8, 1, 0.8, 0.6],
      'clamp'
    );

    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [0.3, 0.5, 1, 0.5, 0.3],
      'clamp'
    );

    const rotateX = interpolate(
      scrollY.value,
      inputRange,
      [45, 20, 0, -20, -45],
      'clamp'
    );

    return {
      transform: [
        { scale },
        { perspective: 500 },
        { rotateX: `${rotateX}deg` },
      ],
      opacity,
    };
  });

  const isSelected = item === selectedValue;
  const fontSize = getFontSizeForValue(item);
  const fontWeight = getFontWeightForValue(item);

  return (
    <Animated.View style={[styles.item, animatedStyle]}>
      <Text
        style={[
          styles.itemText,
          {
            fontSize: isSelected ? fontSize : 28,
            fontWeight: isSelected ? fontWeight : '400',
            color: isSelected ? colors.text.primary : colors.text.muted,
          },
        ]}
      >
        {item}
      </Text>
      <Text
        style={[
          styles.suffixText,
          {
            opacity: isSelected ? 1 : 0.5,
          },
        ]}
      >
        {suffix}
      </Text>
    </Animated.View>
  );
}

export default function TsundokuWheelPicker({
  value,
  onValueChange,
  minValue = 1,
  maxValue = 100,
}: TsundokuWheelPickerProps) {
  const flatListRef = useRef<Animated.FlatList<number>>(null);
  const scrollY = useSharedValue(0);
  const lastHapticValue = useRef(value);

  // Generate items array
  const items = useMemo(() => generateItems(minValue, maxValue), [minValue, maxValue]);

  // Scroll to initial value on mount
  useEffect(() => {
    const index = items.indexOf(value);
    if (index >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, []);

  // Haptic feedback on value change
  const triggerHaptic = useCallback((newValue: number) => {
    if (newValue !== lastHapticValue.current) {
      // Milestone haptics
      const milestones = [10, 25, 50, 75, 100];
      if (milestones.includes(newValue)) {
        HapticsService.feedbackHeavy();
      } else if (Math.abs(newValue - lastHapticValue.current) >= 5) {
        HapticsService.feedbackLight();
      } else {
        HapticsService.feedbackSelection();
      }
      lastHapticValue.current = newValue;
    }
  }, []);

  // Handle viewable items change
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Find the center item
      const centerItem = viewableItems.find((item) => item.isViewable);
      if (centerItem && typeof centerItem.item === 'number') {
        const newValue = centerItem.item;
        if (newValue !== value) {
          onValueChange(newValue);
          triggerHaptic(newValue);
        }
      }
    },
    [value, onValueChange, triggerHaptic]
  );

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    }),
    []
  );

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  // Handle scroll events - using animated scroll handler for UI thread execution
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Handle momentum scroll end - snap to nearest item
  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const newValue = items[clampedIndex];

      if (newValue !== value) {
        onValueChange(newValue);
        triggerHaptic(newValue);
      }
    },
    [items, value, onValueChange, triggerHaptic]
  );

  // Render item
  const renderItem = useCallback(
    ({ item, index }: { item: number; index: number }) => (
      <WheelItem
        item={item}
        index={index}
        scrollY={scrollY}
        selectedValue={value}
      />
    ),
    [scrollY, value]
  );

  // Key extractor
  const keyExtractor = useCallback((item: number) => item.toString(), []);

  // Get item layout for performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      {/* Selection indicator */}
      <View style={styles.selectionIndicator} pointerEvents="none" />

      <Animated.FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
        }}
        getItemLayout={getItemLayout}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        scrollEventThrottle={16}
      />

      {/* Visual Weight Indicator */}
      <View style={styles.weightIndicator}>
        <View
          style={[
            styles.weightBar,
            {
              width: `${Math.min(100, (value / maxValue) * 100)}%`,
              backgroundColor: getWeightColor(value),
            },
          ]}
        />
      </View>
    </View>
  );
}

// Get color based on weight/value
const getWeightColor = (value: number): string => {
  if (value <= 10) return colors.accent.primary;
  if (value <= 30) return '#4CAF50';
  if (value <= 50) return '#FFC107';
  return '#F44336';
};

const styles = StyleSheet.create({
  container: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  selectionIndicator: {
    position: 'absolute',
    top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.accent.primary + '40',
    backgroundColor: colors.accent.primary + '10',
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  itemText: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  suffixText: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
  },
  weightIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.xl,
    right: spacing.xl,
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
  },
  weightBar: {
    height: '100%',
    borderRadius: 2,
  },
});
