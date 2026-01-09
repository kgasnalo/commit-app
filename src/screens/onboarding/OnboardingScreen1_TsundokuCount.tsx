/**
 * OnboardingScreen1_TsundokuCount
 * Phase 2.1.2 - The Visual Weight
 *
 * Wheel picker for selecting unread book count with dynamic font weight.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import TsundokuWheelPicker from '../../components/onboarding/TsundokuWheelPicker';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { useReactiveToast } from '../../hooks/useReactiveToast';
import { TSUNDOKU_TOASTS } from '../../config/toastTriggers';
import i18n from '../../i18n';

export default function OnboardingScreen1({ navigation }: any) {
  const [selectedValue, setSelectedValue] = useState(5);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { checkAndShowToast, resetShownToasts } = useReactiveToast();

  // Reset toast tracking when screen loads
  useEffect(() => {
    resetShownToasts();
  }, [resetShownToasts]);

  // Handle value change from wheel picker
  const handleValueChange = useCallback(
    (value: number) => {
      setSelectedValue(value);
      setHasInteracted(true);

      // Check and show reactive toast
      checkAndShowToast(value, TSUNDOKU_TOASTS);
    },
    [checkAndShowToast]
  );

  // Handle next button press
  const handleNext = useCallback(() => {
    // Store the selected value (could use AsyncStorage or Context)
    // For now, just navigate
    navigation.navigate('Onboarding2', { tsundokuCount: selectedValue });
  }, [navigation, selectedValue]);

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={14}
      title={i18n.t('onboarding.screen1_title')}
      subtitle={i18n.t('onboarding.screen1_subtitle')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={handleNext}
          disabled={!hasInteracted}
        />
      }
    >
      <View style={styles.pickerContainer}>
        <TsundokuWheelPicker
          value={selectedValue}
          onValueChange={handleValueChange}
          minValue={1}
          maxValue={100}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
