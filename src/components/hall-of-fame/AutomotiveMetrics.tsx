import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { titanColors, titanTypography } from '../../theme/titan';
import i18n from '../../i18n';

interface AutomotiveMetricsProps {
  daysToComplete: number;
  pagesPerDay: number;
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * AutomotiveMetrics - Precision Instrument Style
 * Luxury car gauge / watch dial aesthetic
 *
 * Features:
 * - Ultra-large bold numbers (fontWeight: 600, fontSize: 48)
 * - Self-glow effect (orange text shadow)
 * - Micro labels (fontSize: 12, fontWeight: 600)
 * - Glass rod separator (gradient fade top/bottom)
 */
export function AutomotiveMetrics({
  daysToComplete,
  pagesPerDay,
  compact = false,
  style,
}: AutomotiveMetricsProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      {/* Days to Complete */}
      <View style={[styles.metricBox, compact && styles.metricBoxCompact]}>
        <Text style={[styles.label, compact && styles.labelCompact]}>
          {i18n.t('hallOfFame.daysToComplete')}
        </Text>
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {daysToComplete}
        </Text>
      </View>

      {/* Glass Rod Separator - gradient fade top/bottom */}
      <View style={styles.separatorContainer}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.2)',
            'rgba(255, 255, 255, 0.3)',
            'rgba(255, 255, 255, 0.2)',
            'transparent',
          ]}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={styles.separator}
        />
      </View>

      {/* Pages Per Day */}
      <View style={[styles.metricBox, compact && styles.metricBoxCompact]}>
        <Text style={[styles.label, compact && styles.labelCompact]}>
          {i18n.t('hallOfFame.pagesPerDay')}
        </Text>
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {pagesPerDay}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // No background - glass panel handles this
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  containerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricBoxCompact: {
    flex: 1,
  },
  // Micro label - guaranteed visibility with shadow
  label: {
    fontSize: 12,
    letterSpacing: 0.5,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    // Strong shadow for visibility on any background
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  labelCompact: {
    fontSize: 12,
    marginBottom: 4,
  },
  // Precision instrument number - bolder with guaranteed visibility
  value: {
    fontSize: 48, // Giant gauge number
    fontWeight: '600', // Bolder for visibility (was 200)
    color: '#FFFFFF',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    // Strong black shadow + subtle orange glow
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  valueCompact: {
    fontSize: 24,
    textShadowRadius: 6,
  },
  // Glass rod separator container
  separatorContainer: {
    width: 1,
    height: 60,
    marginHorizontal: 24,
  },
  separator: {
    width: 1,
    height: '100%',
  },
});

export default AutomotiveMetrics;
