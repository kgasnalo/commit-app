import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

const AMOUNTS = [
  { id: '1000', value: 1000, label: '¥1,000' },
  { id: '3000', value: 3000, label: '¥3,000' },
  { id: '5000', value: 5000, label: '¥5,000' },
  { id: '10000', value: 10000, label: '¥10,000' },
];

export default function OnboardingScreen5({ navigation, route }: any) {
  const { selectedBook, deadline } = route.params;
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const handleContinue = () => {
    if (!selectedAmount) return;
    navigation.navigate('Onboarding6', {
      selectedBook,
      deadline,
      pledgeAmount: selectedAmount,
    });
  };

  return (
    <OnboardingLayout
      currentStep={5}
      totalSteps={13}
      title="本気度を、金額で示せ。"
      subtitle="読み切れなかったとき、いくら払う覚悟がある？"
      footer={
        <PrimaryButton
          label="次へ"
          onPress={handleContinue}
          disabled={!selectedAmount}
        />
      }
    >
      <View style={styles.amountsContainer}>
        {AMOUNTS.map((amount) => (
          <TouchableOpacity
            key={amount.id}
            style={[
              styles.amountCard,
              selectedAmount === amount.value && styles.amountCardSelected,
            ]}
            onPress={() => setSelectedAmount(amount.value)}
          >
            <Text
              style={[
                styles.amountLabel,
                selectedAmount === amount.value && styles.amountLabelSelected,
              ]}
            >
              {amount.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.note}>
        失敗時のペナルティは、子どもの教育支援に全額寄付されます。
      </Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  amountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountCard: {
    width: '48%',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  amountCardSelected: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  amountLabel: {
    color: colors.text.primary,
    fontSize: typography.fontSize.headingSmall,
    fontWeight: typography.fontWeight.bold,
  },
  amountLabelSelected: {
    color: colors.accent.primary,
  },
  note: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: typography.fontSize.caption * 1.6,
  },
});
