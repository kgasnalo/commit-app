import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { titanColors, titanTypography } from '../../theme/titan';
import i18n from '../../i18n';

interface AutomotiveMetricsProps {
  daysToComplete: number;
  pagesPerDay: number;
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * AutomotiveMetrics - Car specification style reading stats
 * Displays metrics like a luxury vehicle spec sheet
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

      {/* Divider */}
      <View style={styles.divider} />

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
    backgroundColor: 'rgba(26, 23, 20, 0.6)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  containerCompact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricBoxCompact: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: titanColors.text.secondary,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  labelCompact: {
    fontSize: 8,
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '200',
    color: titanColors.text.primary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    fontSize: 20,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
});

export default AutomotiveMetrics;
