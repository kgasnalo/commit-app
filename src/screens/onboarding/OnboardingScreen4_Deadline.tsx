import React from 'react';
import { View } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SelectionCard from '../../components/onboarding/SelectionCard';
import i18n from '../../i18n';

const getOptions = () => [
  { id: '1-week', labelKey: 'onboarding.screen4_option1', days: 7 },
  { id: '2-weeks', labelKey: 'onboarding.screen4_option2', days: 14 },
  { id: '3-weeks', labelKey: 'onboarding.screen4_option3', days: 21 },
  { id: '1-month', labelKey: 'onboarding.screen4_option4', days: 30 },
];

export default function OnboardingScreen4({ navigation, route }: any) {
  const { selectedBook, tsundokuCount } = route.params || {};

  const handleSelect = (option: ReturnType<typeof getOptions>[0]) => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + option.days);
    navigation.navigate('Onboarding6', {
      selectedBook,
      deadline: deadline.toISOString(),
      pledgeAmount: 0,
      currency: 'JPY',
      tsundokuCount,
    });
  };

  return (
    <OnboardingLayout
      currentStep={5}
      totalSteps={14}
      title={i18n.t('onboarding.screen4_title')}
    >
      <View>
        {getOptions().map((option) => (
          <SelectionCard
            key={option.id}
            label={i18n.t(option.labelKey)}
            onPress={() => handleSelect(option)}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}
