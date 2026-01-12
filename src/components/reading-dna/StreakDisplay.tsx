import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Trophy, Calendar } from 'lucide-react-native';
import { GlassTile } from '../titan/GlassTile';
import { MicroLabel } from '../titan/MicroLabel';
import i18n from '../../i18n';
import { StreakStats } from '../../lib/MonkModeService';

interface StreakDisplayProps {
  stats: StreakStats | null;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ stats }) => {
  if (!stats) return null;

  const hasCurrentStreak = stats.currentStreak > 0;

  return (
    <GlassTile padding="lg" style={styles.container}>
      <View style={styles.statsRow}>
        {/* Current Streak */}
        <View style={styles.statItem}>
          <View style={[styles.iconContainer, hasCurrentStreak && styles.iconContainerActive]}>
            <Flame size={20} color={hasCurrentStreak ? '#FF6B35' : 'rgba(255, 255, 255, 0.4)'} />
          </View>
          <Text style={[styles.statValue, hasCurrentStreak && styles.statValueActive]}>
            {stats.currentStreak}
          </Text>
          <MicroLabel style={styles.statLabel}>
            {i18n.t('readingDna.current_streak')}
          </MicroLabel>
        </View>

        {/* Longest Streak */}
        <View style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Trophy size={20} color="rgba(255, 255, 255, 0.4)" />
          </View>
          <Text style={styles.statValue}>{stats.longestStreak}</Text>
          <MicroLabel style={styles.statLabel}>
            {i18n.t('readingDna.longest_streak')}
          </MicroLabel>
        </View>

        {/* Total Days */}
        <View style={styles.statItem}>
          <View style={styles.iconContainer}>
            <Calendar size={20} color="rgba(255, 255, 255, 0.4)" />
          </View>
          <Text style={styles.statValue}>{stats.totalReadingDays}</Text>
          <MicroLabel style={styles.statLabel}>
            {i18n.t('readingDna.total_days')}
          </MicroLabel>
        </View>
      </View>
    </GlassTile>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '200',
    color: '#FAFAFA',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  statValueActive: {
    color: '#FF6B35',
    textShadowColor: 'rgba(255, 107, 53, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    fontSize: 10,
  },
});

export default StreakDisplay;
