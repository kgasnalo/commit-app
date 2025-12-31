import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function OnboardingScreen10({ navigation }: any) {
  return (
    <OnboardingLayout
      currentStep={10}
      totalSteps={14}
      title=""
      footer={
        <PrimaryButton
          label="次へ"
          onPress={() => navigation.navigate('Onboarding11')}
        />
      }
    >
      <View style={styles.quoteContainer}>
        <Ionicons name="chatbubble-outline" size={40} color={colors.accent.primary} />
        <Text style={styles.quote}>
          "読書は最もコスパの良い自己投資だ"
        </Text>
        <Text style={styles.attribution}>
          — 世界の経営者たちの共通見解
        </Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  quoteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  quote: {
    color: colors.text.primary,
    fontSize: typography.fontSize.headingMedium,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: typography.fontSize.headingMedium * 1.4,
  },
  attribution: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.body,
    marginTop: spacing.lg,
  },
});
