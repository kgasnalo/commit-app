import React from 'react';
import { View } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SelectionCard from '../../components/onboarding/SelectionCard';
import i18n from '../../i18n';

const getOptions = () => [
  { id: '1-3', labelKey: 'onboarding.screen1_option1' },
  { id: '4-10', labelKey: 'onboarding.screen1_option2' },
  { id: '11-30', labelKey: 'onboarding.screen1_option3' },
  { id: '31+', labelKey: 'onboarding.screen1_option4' },
];

export default function OnboardingScreen1({ navigation }: any) {
  const handleSelect = (optionId: string) => {
    // 選択を保存（AsyncStorage or Context）
    navigation.navigate('Onboarding2');
  };

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={14}
      title={i18n.t('onboarding.screen1_title')}
      subtitle={i18n.t('onboarding.screen1_subtitle')}
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
