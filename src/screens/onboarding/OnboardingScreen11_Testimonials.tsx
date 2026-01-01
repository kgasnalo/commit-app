import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n from '../../i18n';

const getTESTIMONIALS = () => [
  {
    nameKey: 'onboarding.screen11_testimonial1_name',
    roleKey: 'onboarding.screen11_testimonial1_role',
    textKey: 'onboarding.screen11_testimonial1_text',
  },
  {
    nameKey: 'onboarding.screen11_testimonial2_name',
    roleKey: 'onboarding.screen11_testimonial2_role',
    textKey: 'onboarding.screen11_testimonial2_text',
  },
  {
    nameKey: 'onboarding.screen11_testimonial3_name',
    roleKey: 'onboarding.screen11_testimonial3_role',
    textKey: 'onboarding.screen11_testimonial3_text',
  },
];

export default function OnboardingScreen11({ navigation }: any) {
  return (
    <OnboardingLayout
      currentStep={11}
      totalSteps={14}
      title={i18n.t('onboarding.screen11_title')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={() => navigation.navigate('Onboarding12')}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {getTESTIMONIALS().map((testimonial, index) => (
          <View key={index} style={styles.testimonialCard}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={colors.text.muted} />
              </View>
              <View>
                <Text style={styles.name}>{i18n.t(testimonial.nameKey)}</Text>
                <Text style={styles.role}>{i18n.t(testimonial.roleKey)}</Text>
              </View>
            </View>
            <Text style={styles.text}>{i18n.t(testimonial.textKey)}</Text>
          </View>
        ))}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  testimonialCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  name: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
  },
  role: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  text: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    lineHeight: typography.fontSize.body * 1.6,
  },
});
