import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';
import { MicroLabel } from './MicroLabel';
import i18n from '../../i18n';

// Activity level colors - Soft Light Indicator Style
// Design: "埋め込み式のソフトライト・インジケーター" - Embedded soft-light indicators
// Inactive: Dark brown glass (like unlit instrument panel)
// Active: Glowing orange (like light emanating from inside glass)
const LEVEL_COLORS = [
  '#0F0A06',                    // 0: unlit - dark brown glass
  'rgba(255, 107, 53, 0.4)',    // 1: dim glow
  'rgba(255, 107, 53, 0.7)',    // 2: medium glow
  '#FF6B35',                    // 3: full illumination
];

// Month names (short form)
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Block dimensions for positioning
const BLOCK_SIZE = 16;
const BLOCK_GAP = 4;
const BLOCK_TOTAL = BLOCK_SIZE + BLOCK_GAP; // 20px per block

interface MonthLabel {
  month: string;
  index: number;
}

export interface ActivityDay {
  date: string;
  level: 0 | 1 | 2 | 3;
  isToday?: boolean;
}

interface ActivityMatrixProps {
  data?: ActivityDay[];
  days?: number;
  onDayPress?: (day: ActivityDay) => void;
  /** Compact mode for dashboard header - smaller blocks, no header */
  compact?: boolean;
  /** Show header row with label and duration */
  showHeader?: boolean;
}

// Individual block with tap animation - Soft Light Indicator
function ActivityBlock({
  level,
  isToday,
  onPress,
  compact,
}: {
  level: number;
  isToday?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    HapticsService.feedbackLight();
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1.0, { damping: 15 })
    );
    onPress?.();
  };

  // Inner glow intensity based on level
  const glowOpacity = level === 3 ? 0.8 : level === 2 ? 0.5 : level === 1 ? 0.25 : 0;

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          compact ? styles.blockCompact : styles.block,
          { backgroundColor: LEVEL_COLORS[level] || LEVEL_COLORS[0] },
          // Inner glow effect - light emanating from within glass
          level >= 1 && {
            shadowColor: '#FF6B35',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowOpacity,
            shadowRadius: compact ? 3 : 5,
            elevation: level >= 2 ? 3 : 1,
          },
          isToday && styles.todayBlock,
          animatedStyle,
        ]}
      />
    </Pressable>
  );
}

/**
 * ActivityMatrix
 *
 * Soft-light indicator style contribution heatmap.
 * Design: "ステータスランプを確認するような体験" - Like checking status lamps on a dashboard
 * Reference: Titan Design System - Executive Cockpit aesthetic
 */
export const ActivityMatrix: React.FC<ActivityMatrixProps> = ({
  data,
  days = 30,
  onDayPress,
  compact = false,
  showHeader = true,
}) => {
  // Generate display data
  const displayData = useMemo(() => {
    if (data && data.length > 0) {
      return data.slice(-days);
    }

    // Mock data for prototype
    return Array.from({ length: days }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const random = Math.random();
      const level = random > 0.7 ? 3 : random > 0.5 ? 2 : random > 0.3 ? 1 : 0;
      return {
        date: date.toISOString().split('T')[0],
        level: level as 0 | 1 | 2 | 3,
        isToday: i === days - 1,
      };
    });
  }, [data, days]);

  // Calculate month labels positions
  const monthLabels = useMemo(() => {
    const labels: MonthLabel[] = [];
    let prevMonth: number | null = null;

    displayData.forEach((day, index) => {
      if (!day.date) return;

      const date = new Date(day.date);
      const month = date.getMonth();

      // Add label at first day or when month changes
      if (index === 0 || (prevMonth !== null && month !== prevMonth)) {
        labels.push({
          month: MONTH_NAMES[month],
          index,
        });
      }
      prevMonth = month;
    });

    return labels;
  }, [displayData]);

  // Calculate compact block total for positioning
  const blockTotal = compact ? 12 + 3 : BLOCK_TOTAL; // 15px for compact, 20px for normal

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {showHeader && (
        <View style={styles.headerRow}>
          <MicroLabel style={styles.label}>
            {i18n.t('dashboard.activity_log') || 'ACTIVITY'}
          </MicroLabel>
          <MicroLabel style={styles.duration}>
            {days}{i18n.t('dashboard.days_suffix') || 'D'}
          </MicroLabel>
        </View>
      )}

      {/* Month Labels Row - Only show if not compact */}
      {showHeader && !compact && (
        <View style={styles.monthLabelsRow}>
          {monthLabels.map((label, i) => (
            <Text
              key={`${label.month}-${label.index}`}
              style={[
                styles.monthLabel,
                { left: label.index * blockTotal },
              ]}
            >
              {label.month}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.grid, compact && styles.gridCompact]}>
        {displayData.map((day, index) => (
          <ActivityBlock
            key={day.date || index}
            level={day.level}
            isToday={day.isToday}
            onPress={() => onDayPress?.(day)}
            compact={compact}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  containerCompact: {
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  duration: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  monthLabelsRow: {
    position: 'relative',
    height: 14,
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridCompact: {
    gap: 3,
  },
  block: {
    width: 16,
    height: 16,
    borderRadius: 4,
    // Base glass appearance - subtle inner shadow
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  blockCompact: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  todayBlock: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});

export default ActivityMatrix;
