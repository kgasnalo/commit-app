import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      totalSteps={14}
      title="覚悟を、金額で示せ。"
      subtitle="読み切れなかったら、いくら届ける？"
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

      {/* 寄付先情報 */}
      <View style={styles.donationInfo}>
        <Ionicons name="book" size={20} color={colors.accent.primary} />
        <View style={styles.donationTextContainer}>
          <Text style={styles.donationTitle}>📚 本を届ける活動に寄付されます</Text>
          <Text style={styles.donationOrg}>Room to Read（子どもの教育支援）</Text>
        </View>
      </View>

      <Text style={styles.note}>
        読了できなかった場合、この金額がRoom to Readに届けられます。
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
  donationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  donationTextContainer: {
    flex: 1,
  },
  donationTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  donationOrg: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  note: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: typography.fontSize.caption * 1.6,
  },
});
