import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n from '../../i18n';

const getFEATURES = () => [
  {
    id: 'deadline',
    icon: 'time-outline',
    titleKey: 'onboarding.screen9_feature1_title',
    descriptionKey: 'onboarding.screen9_feature1_desc',
  },
  {
    id: 'penalty',
    icon: 'flame-outline',
    titleKey: 'onboarding.screen9_feature2_title',
    descriptionKey: 'onboarding.screen9_feature2_desc',
  },
  {
    id: 'donation',
    icon: 'heart-outline',
    titleKey: 'onboarding.screen9_feature3_title',
    descriptionKey: 'onboarding.screen9_feature3_desc',
  },
];

export default function OnboardingScreen9({ navigation }: any) {
  return (
    <OnboardingLayout
      currentStep={9}
      totalSteps={14}
      title={i18n.t('onboarding.screen9_title')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={() => navigation.navigate('Onboarding10')}
        />
      }
    >
      <View style={styles.features}>
        {getFEATURES().map((feature) => (
          <View key={feature.id} style={styles.featureCard}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={feature.icon as any}
                size={28}
                color={colors.accent.primary}
              />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{i18n.t(feature.titleKey)}</Text>
              <Text style={styles.featureDescription}>{i18n.t(feature.descriptionKey)}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  features: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  featureTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  featureDescription: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
});
