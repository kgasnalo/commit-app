import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Timer, TrendingUp, TrendingDown } from 'lucide-react-native';
import { MicroLabel } from '../titan/MicroLabel';
import { GlassTile } from '../titan/GlassTile';
import { ActivityMatrix, ActivityDay } from '../titan/ActivityMatrix';
import { ReaderTypeCard } from './ReaderTypeCard';
import { StreakDisplay } from './StreakDisplay';
import { InsightCard } from './InsightCard';
import i18n from '../../i18n';
import {
  ReaderTypeResult,
  StreakStats,
  ReadingInsights,
  HeatmapDay,
} from '../../lib/MonkModeService';

interface ReadingDNASectionProps {
  readerType: ReaderTypeResult | null;
  heatmapData: HeatmapDay[];
  streakStats: StreakStats | null;
  insights: ReadingInsights | null;
}

export const ReadingDNASection: React.FC<ReadingDNASectionProps> = ({
  readerType,
  heatmapData,
  streakStats,
  insights,
}) => {
  // Format peak hour
  const formatPeakHour = (hour: number): string => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  };

  // Format vs last month
  const formatVsLastMonth = (percent: number): string => {
    if (percent > 0) return `+${percent}%`;
    if (percent < 0) return `${percent}%`;
    return '0%';
  };

  // Convert HeatmapDay to ActivityDay for ActivityMatrix
  const activityData: ActivityDay[] = heatmapData.map(day => ({
    date: day.date,
    level: day.level,
    isToday: day.isToday,
  }));

  const isPositiveTrend = insights && insights.thisMonthVsLast >= 0;

  return (
    <View style={styles.container}>
      <MicroLabel style={styles.sectionTitle}>
        {i18n.t('readingDna.title')}
      </MicroLabel>

      {/* Reader Type Card */}
      <ReaderTypeCard readerType={readerType} />

      {/* Activity Heatmap */}
      <GlassTile padding="md" style={styles.heatmapContainer}>
        <ActivityMatrix data={activityData} days={30} />
      </GlassTile>

      {/* Streak Statistics */}
      <StreakDisplay stats={streakStats} />

      {/* Insights Grid */}
      {insights && insights.totalSessions > 0 && (
        <View style={styles.insightsGrid}>
          <InsightCard
            icon={<Clock size={20} color="rgba(255, 255, 255, 0.5)" />}
            label={i18n.t('readingDna.peak_time')}
            value={formatPeakHour(insights.peakHour)}
          />

          <View style={styles.insightGap} />

          <InsightCard
            icon={<Timer size={20} color="rgba(255, 255, 255, 0.5)" />}
            label={i18n.t('readingDna.avg_session')}
            value={`${insights.avgSessionMinutes}m`}
          />

          <View style={styles.insightGap} />

          <InsightCard
            icon={
              isPositiveTrend
                ? <TrendingUp size={20} color="#34C759" />
                : <TrendingDown size={20} color="#FF6B6B" />
            }
            label={i18n.t('readingDna.vs_last_month')}
            value={formatVsLastMonth(insights.thisMonthVsLast)}
            highlight={insights.thisMonthVsLast > 0}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 2,
  },
  heatmapContainer: {
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightGap: {
    width: 8,
  },
});

export default ReadingDNASection;
