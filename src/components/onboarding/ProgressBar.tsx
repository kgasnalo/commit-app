import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme';

type Props = {
  currentStep: number;
  totalSteps: number;
};

export default function ProgressBar({ currentStep, totalSteps }: Props) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.progress, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  track: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  },
});
