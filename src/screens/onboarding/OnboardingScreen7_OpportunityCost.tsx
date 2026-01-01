import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors } from '../../theme';
import i18n from '../../i18n';

export default function OnboardingScreen7({ navigation }: any) {
  return (
    <OnboardingLayout
      currentStep={7}
      totalSteps={14}
      title={i18n.t('onboarding.screen7_title')}
      subtitle={i18n.t('onboarding.screen7_subtitle')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={() => navigation.navigate('Onboarding8')}
        />
      }
    >
      <View style={styles.illustration}>
        <Ionicons name="trending-up" size={120} color={colors.accent.primary} />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  illustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
