import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n from '../../i18n';

type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW';

const CURRENCY_OPTIONS: { code: Currency; symbol: string; name: string }[] = [
  { code: 'JPY', symbol: '¥', name: '日本円' },
  { code: 'USD', symbol: '$', name: '米ドル' },
  { code: 'EUR', symbol: '€', name: 'ユーロ' },
  { code: 'GBP', symbol: '£', name: '英ポンド' },
  { code: 'KRW', symbol: '₩', name: '韓国ウォン' },
];

const AMOUNTS_BY_CURRENCY: Record<Currency, { id: string; value: number; label: string }[]> = {
  JPY: [
    { id: '1000', value: 1000, label: '¥1,000' },
    { id: '3000', value: 3000, label: '¥3,000' },
    { id: '5000', value: 5000, label: '¥5,000' },
    { id: '10000', value: 10000, label: '¥10,000' },
  ],
  USD: [
    { id: '7', value: 7, label: '$7' },
    { id: '20', value: 20, label: '$20' },
    { id: '35', value: 35, label: '$35' },
    { id: '70', value: 70, label: '$70' },
  ],
  EUR: [
    { id: '6', value: 6, label: '€6' },
    { id: '18', value: 18, label: '€18' },
    { id: '30', value: 30, label: '€30' },
    { id: '60', value: 60, label: '€60' },
  ],
  GBP: [
    { id: '5', value: 5, label: '£5' },
    { id: '15', value: 15, label: '£15' },
    { id: '25', value: 25, label: '£25' },
    { id: '50', value: 50, label: '£50' },
  ],
  KRW: [
    { id: '9000', value: 9000, label: '₩9,000' },
    { id: '27000', value: 27000, label: '₩27,000' },
    { id: '45000', value: 45000, label: '₩45,000' },
    { id: '90000', value: 90000, label: '₩90,000' },
  ],
};

export default function OnboardingScreen5({ navigation, route }: any) {
  const { selectedBook, deadline } = route.params;
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('JPY');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const handleContinue = () => {
    if (!selectedAmount) return;
    navigation.navigate('Onboarding6', {
      selectedBook,
      deadline,
      pledgeAmount: selectedAmount,
      currency: selectedCurrency,
    });
  };

  const amounts = AMOUNTS_BY_CURRENCY[selectedCurrency];

  return (
    <OnboardingLayout
      currentStep={5}
      totalSteps={14}
      title={i18n.t('onboarding.screen5_title')}
      subtitle={i18n.t('onboarding.screen5_subtitle')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={handleContinue}
          disabled={!selectedAmount}
        />
      }
    >
      {/* 通貨選択 */}
      <View style={styles.currencyContainer}>
        <Text style={styles.currencyLabel}>{i18n.t('onboarding.screen5_select_currency')}</Text>
        <View style={styles.currencyButtons}>
          {CURRENCY_OPTIONS.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyButton,
                selectedCurrency === currency.code && styles.currencyButtonSelected,
              ]}
              onPress={() => {
                setSelectedCurrency(currency.code);
                setSelectedAmount(null); // 通貨変更時に金額選択をリセット
              }}
            >
              <Text
                style={[
                  styles.currencyButtonText,
                  selectedCurrency === currency.code && styles.currencyButtonTextSelected,
                ]}
              >
                {currency.symbol} {currency.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 金額選択 */}
      <View style={styles.amountsContainer}>
        {amounts.map((amount) => (
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
          <Text style={styles.donationTitle}>{i18n.t('onboarding.screen5_donation_info')}</Text>
          <Text style={styles.donationOrg}>Room to Read</Text>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  currencyContainer: {
    marginBottom: spacing.lg,
  },
  currencyLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: spacing.sm,
  },
  currencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  currencyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
  },
  currencyButtonSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  currencyButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
  },
  currencyButtonTextSelected: {
    color: colors.text.primary,
  },
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
