import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MicroLabel } from './MicroLabel';
import i18n from '../../i18n';

// Activity level colors (Titan orange palette)
const LEVEL_COLORS = [
  '#1A1A1A',                    // 0: inactive (dark grey)
  'rgba(255, 107, 53, 0.35)',   // 1: low activity
  'rgba(255, 107, 53, 0.65)',   // 2: medium activity
  '#FF6B35',                    // 3: high activity
];

export interface ActivityDay {
  date: string;
  level: 0 | 1 | 2 | 3;
  isToday?: boolean;
}

interface ActivityMatrixProps {
  data?: ActivityDay[];
  days?: number;
  onDayPress?: (day: ActivityDay) => void;
}

// Individual block with tap animation
function ActivityBlock({
  level,
  isToday,
  onPress,
}: {
  level: number;
  isToday?: boolean;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1.0, { damping: 15 })
    );
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.block,
          { backgroundColor: LEVEL_COLORS[level] || LEVEL_COLORS[0] },
          level >= 2 && styles.blockGlow,
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
 * GitHub-style contribution heatmap with Titan orange aesthetic.
 * Reference: Report sales screen heatmap from design spec.
 */
export const ActivityMatrix: React.FC<ActivityMatrixProps> = ({
  data,
  days = 30,
  onDayPress,
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MicroLabel style={styles.label}>
          {i18n.t('dashboard.activity_log') || 'ACTIVITY'}
        </MicroLabel>
        <MicroLabel style={styles.duration}>
          {days}{i18n.t('dashboard.days_suffix') || 'D'}
        </MicroLabel>
      </View>

      <View style={styles.grid}>
        {displayData.map((day, index) => (
          <ActivityBlock
            key={day.date || index}
            level={day.level}
            isToday={day.isToday}
            onPress={() => onDayPress?.(day)}
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
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  block: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  blockGlow: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  todayBlock: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default ActivityMatrix;
