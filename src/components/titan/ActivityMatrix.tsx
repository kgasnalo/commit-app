import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { TacticalText } from './TacticalText';
import { MicroLabel } from './MicroLabel';

interface ActivityMatrixProps {
  // In a real implementation, this would take an array of activity levels (0-4)
  // For now, we simulate a "live" pattern
  data?: number[]; 
}

/**
 * ActivityMatrix
 * 
 * A GitHub-style contribution graph adapted for the Titan aesthetic.
 * Visualizes consistency and "System Activity".
 */
export const ActivityMatrix: React.FC<ActivityMatrixProps> = ({ data }) => {
  // Generate a fixed grid of 5 rows x 14 columns (last 2 weeks approx)
  // or a single row strip. Let's do a single horizontal strip for the header.
  // 20 blocks representing the last 20 days.
  
  const blocks = Array.from({ length: 24 }).map((_, i) => {
    // Mock data generation: Make some blocks active (red) and others dormant (dark)
    // Randomize for visual effect in prototype
    const intensity = Math.random() > 0.6 ? (Math.random() > 0.8 ? 2 : 1) : 0;
    return intensity;
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MicroLabel style={styles.label}>ACTIVITY LOG</MicroLabel>
        <TacticalText size={10} color={colors.text.secondary}>T-30D</TacticalText>
      </View>
      
      <View style={styles.grid}>
        {blocks.map((level, index) => (
          <View 
            key={index} 
            style={[
              styles.block,
              level === 0 && styles.blockDormant,
              level === 1 && styles.blockActive,
              level === 2 && styles.blockIntense,
            ]} 
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  label: {
    opacity: 0.7,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  block: {
    height: 12,
    flex: 1, // Distribute width evenly
    borderRadius: 2,
  },
  blockDormant: {
    backgroundColor: colors.background.tertiary,
  },
  blockActive: {
    backgroundColor: colors.signal.active, // Neon Red
    opacity: 0.5,
  },
  blockIntense: {
    backgroundColor: colors.signal.active, // Neon Red
    opacity: 1.0,
    shadowColor: colors.signal.active,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    // Android elevation doesn't support color well, but we add it anyway
    elevation: 2,
  },
});
