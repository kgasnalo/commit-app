import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { titanColors } from '../../theme/titan';

interface FilterItem {
  id: string;
  label: string;
}

interface GlassFilterBarProps {
  filters: FilterItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  style?: ViewStyle;
}

/**
 * GlassFilterBar - Thick Glass styled filter pills
 * Netflix/Spotify style horizontal filter with glass morphism
 *
 * Features:
 * - Horizontal scrollable pills
 * - Glass background with top/left highlight
 * - Active state with subtle glow
 */
export function GlassFilterBar({
  filters,
  selectedId,
  onSelect,
  style,
}: GlassFilterBarProps) {
  return (
    <Animated.View
      entering={FadeIn.delay(300).duration(400)}
      style={[styles.container, style]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "All" filter */}
        <TouchableOpacity
          style={[
            styles.pill,
            selectedId === null && styles.pillActive,
          ]}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          {selectedId === null && <View style={styles.pillGlow} />}
          <Text style={[
            styles.pillText,
            selectedId === null && styles.pillTextActive,
          ]}>
            ALL
          </Text>
        </TouchableOpacity>

        {/* Filter items */}
        {filters.map((filter) => {
          const isActive = selectedId === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.pill,
                isActive && styles.pillActive,
              ]}
              onPress={() => onSelect(filter.id)}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.pillGlow} />}
              <Text style={[
                styles.pillText,
                isActive && styles.pillTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Top highlight edge for glass effect */}
      <View style={styles.glassHighlightTop} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    // Top/Left highlight only for glass depth
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassHighlightTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  pillActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    // Subtle border for active state
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  pillGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: titanColors.text.muted,
    textTransform: 'uppercase',
  },
  pillTextActive: {
    color: titanColors.accent.primary,
    fontWeight: '600',
  },
});

export default GlassFilterBar;
