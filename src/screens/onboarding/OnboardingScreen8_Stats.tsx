import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function OnboardingScreen8({ navigation }: any) {
  return (
    <OnboardingLayout
      currentStep={8}
      totalSteps={14}
      title="気合いに頼った人の読了率、23%。"
      footer={
        <PrimaryButton
          label="次へ"
          onPress={() => navigation.navigate('Onboarding9')}
        />
      }
    >
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>23%</Text>
          <Text style={styles.statLabel}>気合いのみ</Text>
        </View>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Text style={[styles.statValue, styles.statValueHighlight]}>87%</Text>
          <Text style={styles.statLabel}>COMMITを使用</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>仕組みが、意志を超える。</Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statCardHighlight: {
    backgroundColor: colors.accent.primary,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statValueHighlight: {
    color: colors.text.primary,
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
