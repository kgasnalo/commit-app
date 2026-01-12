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
 * - Ultra-large thin numbers (fontWeight: 200, fontSize: 48)
 * - Self-glow effect (orange text shadow)
 * - Micro labels (fontSize: 10, opacity: 0.4)
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
  // Micro label - extremely subtle
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: titanColors.text.muted,
    fontWeight: '400',
    marginBottom: 8,
    textTransform: 'uppercase',
    opacity: 0.4, // Very subtle
  },
  labelCompact: {
    fontSize: 8,
    marginBottom: 4,
  },
  // Precision instrument number with Self-Glow
  value: {
    fontSize: 48, // Giant gauge number
    fontWeight: '200', // Ultra-thin
    color: '#FAFAFA',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    // Self-glow effect - orange ambient light
    textShadowColor: 'rgba(255, 140, 80, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
