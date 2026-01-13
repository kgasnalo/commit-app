import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { titanColors } from '../../theme/titan';
import i18n from '../../i18n';

interface FilterItem {
  id: string;
  label: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface GlassFilterBarProps {
  // Month filters
  filters: FilterItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // Tag filters (Notion-style)
  tags?: TagItem[];
  selectedTags?: string[];
  onToggleTag?: (id: string) => void;
  style?: ViewStyle;
}

/**
 * GlassFilterBar - Thick Glass styled filter pills
 * Netflix/Spotify style horizontal filter with glass morphism
 * Now with Notion-style colored tag pills
 *
 * Features:
 * - Month pills (single select)
 * - Tag pills with colors (multi-select, Notion-style)
 * - Glass background with top/left highlight
 */
export function GlassFilterBar({
  filters,
  selectedId,
  onSelect,
  tags = [],
  selectedTags = [],
  onToggleTag,
  style,
}: GlassFilterBarProps) {
  const hasFilters = filters.length > 0 || tags.length > 0;

  if (!hasFilters) return null;

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
        {/* "All" filter - clears month and tags */}
        <TouchableOpacity
          style={[
            styles.pill,
            selectedId === null && selectedTags.length === 0 && styles.pillActive,
          ]}
          onPress={() => {
            onSelect(null);
            // Clear all tags too if onToggleTag exists
          }}
          activeOpacity={0.7}
        >
          {selectedId === null && selectedTags.length === 0 && (
            <View style={styles.pillGlow} />
          )}
          <Text style={[
            styles.pillText,
            selectedId === null && selectedTags.length === 0 && styles.pillTextActive,
          ]}>
            {i18n.t('hallOfFame.filterAll')}
          </Text>
        </TouchableOpacity>

        {/* Separator between All and filters */}
        {(filters.length > 0 || tags.length > 0) && (
          <View style={styles.separator} />
        )}

        {/* Tag filters - Notion style colored pills */}
        {tags.map((tag) => {
          const isActive = selectedTags.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagPill,
                { backgroundColor: isActive ? tag.color : `${tag.color}20` },
                isActive && styles.tagPillActive,
              ]}
              onPress={() => onToggleTag?.(tag.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
              <Text style={[
                styles.tagText,
                { color: isActive ? '#FFFFFF' : tag.color },
              ]}>
                {tag.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Month filters */}
        {filters.map((filter) => {
          const isActive = selectedId === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.pill,
                isActive && styles.pillActive,
              ]}
              onPress={() => onSelect(isActive ? null : filter.id)}
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
    // Removed visible borders - use subtle inner highlights instead
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
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
  },
  // Month pills
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  pillActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
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
    letterSpacing: 0.5,
    color: titanColors.text.muted,
  },
  pillTextActive: {
    color: titanColors.accent.primary,
    fontWeight: '600',
  },
  // Tag pills - Notion style
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagPillActive: {
    // Active state adds slight shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default GlassFilterBar;
