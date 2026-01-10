import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { titanColors, titanTypography } from '../../theme/titan';
import { MicroLabel } from './MicroLabel';

interface MetricDisplayProps {
  value: string;
  label?: string;
  size?: 'large' | 'medium';
  color?: string;
  labelColor?: string;
  style?: TextStyle;
}

export function MetricDisplay({
  value,
  label,
  size = 'medium',
  color = titanColors.text.primary,
  labelColor,
  style,
}: MetricDisplayProps) {
  const sizeStyle = size === 'large'
    ? titanTypography.metricLarge
    : titanTypography.metricMedium;

  return (
    <View style={styles.container}>
      {label && (
        <MicroLabel
          style={[styles.label, labelColor ? { color: labelColor } : undefined]}
        >
          {label}
        </MicroLabel>
      )}
      <Text
        style={[
          styles.value,
          sizeStyle,
          { color },
          style,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  label: {
    marginBottom: 8,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
});

export default MetricDisplay;
