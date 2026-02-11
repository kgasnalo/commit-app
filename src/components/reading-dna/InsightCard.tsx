import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassTile } from '../titan/GlassTile';
import { MicroLabel } from '../titan/MicroLabel';

interface InsightCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  label,
  value,
  subtitle,
  highlight = false,
}) => {
  return (
    <GlassTile
      variant={highlight ? 'glowing' : 'default'}
      padding="md"
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>

      <MicroLabel style={styles.label}>{label}</MicroLabel>

      <Text style={[styles.value, highlight && styles.valueHighlight]}>
        {value}
      </Text>

      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </GlassTile>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    minWidth: 100,
  },
  iconContainer: {
    marginBottom: 8,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FAFAFA',
    textAlign: 'center',
  },
  valueHighlight: {
    color: '#FF6B35',
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default InsightCard;
