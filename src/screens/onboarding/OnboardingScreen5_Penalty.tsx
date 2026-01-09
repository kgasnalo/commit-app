/**
 * OnboardingScreen5_Penalty
 * Phase 2.2.1 - The Haptic Resistance
 *
 * Penalty amount selection with progressive haptic feedback slider
 * and pulsating red vignette for Act 2 "Crisis" atmosphere.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import HapticResistanceSlider from '../../components/onboarding/HapticResistanceSlider';
import PulsatingVignette from '../../components/onboarding/PulsatingVignette';
import { colors, typography, spacing, borderRadius } from '../../theme';
import i18n from '../../i18n';

type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW';

const CURRENCY_OPTIONS: { code: Currency; symbol: string }[] = [
  { code: 'JPY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'KRW', symbol: '₩' },
];

const AMOUNTS_BY_CURRENCY: Record<Currency, { value: number; label: string }[]> = {
  JPY: [
    { value: 0, label: '¥0' },
    { value: 1000, label: '¥1,000' },
    { value: 3000, label: '¥3,000' },
    { value: 5000, label: '¥5,000' },
    { value: 10000, label: '¥10,000' },
  ],
  USD: [
    { value: 0, label: '$0' },
    { value: 7, label: '$7' },
    { value: 20, label: '$20' },
    { value: 35, label: '$35' },
    { value: 70, label: '$70' },
  ],
  EUR: [
    { value: 0, label: '€0' },
    { value: 6, label: '€6' },
    { value: 18, label: '€18' },
    { value: 30, label: '€30' },
    { value: 60, label: '€60' },
  ],
  GBP: [
    { value: 0, label: '£0' },
    { value: 5, label: '£5' },
    { value: 15, label: '£15' },
    { value: 25, label: '£25' },
    { value: 50, label: '£50' },
  ],
  KRW: [
    { value: 0, label: '₩0' },
    { value: 9000, label: '₩9,000' },
    { value: 27000, label: '₩27,000' },
    { value: 45000, label: '₩45,000' },
    { value: 90000, label: '₩90,000' },
  ],
};

export default function OnboardingScreen5({ navigation, route }: any) {
  const { selectedBook, deadline, tsundokuCount } = route.params || {};
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('JPY');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  // Shared value for vignette intensity (controlled by slider)
  const sliderIntensity = useSharedValue(0);

  const handleContinue = () => {
    if (!selectedAmount) return;
    navigation.navigate('Onboarding6', {
      selectedBook,
      deadline,
      pledgeAmount: selectedAmount,
      currency: selectedCurrency,
      tsundokuCount,
    });
  };

  const handleCurrencyChange = useCallback((code: Currency) => {
    setSelectedCurrency(code);
    setSelectedAmount(null);
    sliderIntensity.value = 0;
  }, []);

  const handleAmountChange = useCallback((value: number) => {
    setSelectedAmount(value);
  }, []);

  const handleIntensityChange = useCallback((intensity: number) => {
    sliderIntensity.value = intensity;
  }, []);

  const amounts = AMOUNTS_BY_CURRENCY[selectedCurrency];

  return (
    <>
      {/* Pulsating Vignette Overlay */}
      <PulsatingVignette intensity={sliderIntensity} active={true} />

      <OnboardingLayout
        currentStep={5}
        totalSteps={14}
        title={i18n.t('onboarding.screen5_title')}
        subtitle={i18n.t('onboarding.screen5_subtitle')}
        footer={
          <View style={styles.footerContainer}>
            {/* Donation Info Card */}
            <View style={styles.donationCard}>
              <View style={styles.donationIconContainer}>
                <Ionicons name="heart" size={18} color="#FF6B6B" />
              </View>
              <View style={styles.donationTextContainer}>
                <Text style={styles.donationLabel} numberOfLines={1}>
                  {i18n.t('onboarding.screen5_donation_label')}
                </Text>
                <Text
                  style={styles.donationOrg}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Room to Read
                </Text>
              </View>
            </View>
            <PrimaryButton
              label={i18n.t('onboarding.next')}
              onPress={handleContinue}
              disabled={!selectedAmount}
            />
          </View>
        }
      >
        {/* Currency Selection */}
        <View style={styles.currencyContainer}>
          <Text style={styles.currencyLabel}>
            {i18n.t('onboarding.screen5_select_currency')}
          </Text>
          <View style={styles.currencyButtons}>
            {CURRENCY_OPTIONS.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyButton,
                  selectedCurrency === currency.code && styles.currencyButtonSelected,
                ]}
                onPress={() => handleCurrencyChange(currency.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    selectedCurrency === currency.code &&
                      styles.currencyButtonTextSelected,
                  ]}
                >
                  {currency.symbol} {currency.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Haptic Resistance Slider */}
        <View style={styles.sliderContainer}>
          <HapticResistanceSlider
            presets={amounts}
            currency={selectedCurrency}
            selectedValue={selectedAmount}
            onValueChange={handleAmountChange}
            onIntensityChange={handleIntensityChange}
          />
        </View>

        {/* Rule Confirmation Text - Placed in body after slider to prevent overlap */}
        <View style={styles.ruleTextContainer}>
          <Text
            style={styles.ruleText}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {i18n.t('onboarding.screen5_rule_text_line1')}
          </Text>
          <Text
            style={styles.ruleText}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {i18n.t('onboarding.screen5_rule_text_line2')}
          </Text>
        </View>

      </OnboardingLayout>
    </>
  );
}

// 8pt grid system constants
const GRID = 8;

const styles = StyleSheet.create({
  // Currency Selection Section
  currencyContainer: {
    marginBottom: GRID * 2, // 16
  },
  currencyLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: GRID, // 8
  },
  currencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID, // 8
  },
  currencyButton: {
    paddingHorizontal: GRID * 1.5, // 12
    paddingVertical: GRID, // 8
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: GRID, // 8
  },
  currencyButtonSelected: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  currencyButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  currencyButtonTextSelected: {
    color: '#FF6B6B',
  },

  // Slider Section
  sliderContainer: {
    marginTop: GRID, // 8
    marginBottom: GRID * 4, // 32 - Added more spacing to prevent overlap with footer
  },

  // Rule Text Section - Two lines with proper spacing
  ruleTextContainer: {
    alignItems: 'center',
    gap: 2, // Tight line spacing
    marginTop: GRID * 2, // 16 - Space above from slider labels
    paddingHorizontal: GRID * 2, // 16 - Add horizontal padding for longer text
  },
  ruleText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    flexShrink: 1, // Allow text to shrink for EN/KO
  },

  // Footer Section - Tighter gap between rule text and card
  footerContainer: {
    gap: GRID * 1.5, // 12
  },

  // Donation Card - Premium design with emphasis on organization
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: GRID * 1.5, // 12
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: GRID * 2, // 16
    paddingHorizontal: GRID * 2, // 16
    gap: GRID * 1.5, // 12
  },
  donationIconContainer: {
    width: GRID * 5, // 40
    height: GRID * 5, // 40
    borderRadius: GRID * 2.5, // 20
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  donationTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  donationLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 2,
    flexShrink: 1,
  },
  donationOrg: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});