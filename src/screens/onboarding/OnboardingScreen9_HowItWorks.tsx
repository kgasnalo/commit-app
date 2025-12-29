import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

const FEATURES = [
  {
    icon: 'time-outline',
    title: '締め切り',
    description: '期限を設定して、先延ばしを防ぐ',
  },
  {
    icon: 'cash-outline',
    title: 'ペナルティ',
    description: '金銭的な痛みで、本気度を担保',
  },
  {
    icon: 'heart-outline',
    title: '寄付',
    description: '失敗しても、誰かの学びに変わる',
  },
];

export default function OnboardingScreen9({ navigation, route }: any) {
  return (
    <OnboardingLayout
      currentStep={9}
      totalSteps={13}
      title="意志力ではなく、仕組みで読む。"
      footer={
        <PrimaryButton
          label="次へ"
          onPress={() => navigation.navigate('Onboarding10', route.params)}
        />
      }
    >
      <View style={styles.features}>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={feature.icon as any}
                size={28}
                color={colors.accent.primary}
              />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
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
