import React from 'react';
import { View } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SelectionCard from '../../components/onboarding/SelectionCard';
import i18n from '../../i18n';

const getOptions = () => [
  { id: 'week', labelKey: 'onboarding.screen2_option1' },
  { id: 'month', labelKey: 'onboarding.screen2_option2' },
  { id: '6-months', labelKey: 'onboarding.screen2_option3' },
  { id: 'year+', labelKey: 'onboarding.screen2_option4' },
];

export default function OnboardingScreen2({ navigation, route }: any) {
  const { tsundokuCount } = route.params || {};

  const handleSelect = (optionId: string) => {
    navigation.navigate('Onboarding3', { tsundokuCount });
  };

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={14}
      title={i18n.t('onboarding.screen2_title')}
    >
      <View>
        {getOptions().map((option) => (
          <SelectionCard
            key={option.id}
            label={i18n.t(option.labelKey)}
            onPress={() => handleSelect(option.id)}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}
