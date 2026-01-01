import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n from '../../i18n';

export default function OnboardingScreen8({ navigation }: any) {
  return (
    <OnboardingLayout
      currentStep={8}
      totalSteps={14}
      title={i18n.t('onboarding.screen8_title')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={() => navigation.navigate('Onboarding9')}
        />
      }
    >
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{i18n.t('onboarding.screen8_stat1_value')}</Text>
          <Text style={styles.statLabel}>{i18n.t('onboarding.screen8_stat1_label')}</Text>
        </View>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Text style={[styles.statValue, styles.statValueHighlight]}>{i18n.t('onboarding.screen8_stat2_value')}</Text>
          <Text style={styles.statLabel}>{i18n.t('onboarding.screen8_stat2_label')}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{i18n.t('onboarding.screen8_subtitle')}</Text>
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
