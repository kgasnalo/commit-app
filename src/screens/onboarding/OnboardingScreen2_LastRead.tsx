import React from 'react';
import { View } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SelectionCard from '../../components/onboarding/SelectionCard';

const OPTIONS = [
  { id: 'this-month', label: '今月' },
  { id: '2-3-months', label: '2〜3ヶ月前' },
  { id: '6-months+', label: '半年以上前' },
  { id: 'unknown', label: '思い出せない' },
];

export default function OnboardingScreen2({ navigation }: any) {
  const handleSelect = (optionId: string) => {
    navigation.navigate('Onboarding3');
  };

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={14}
      title="最後に1冊読み切ったのは？"
    >
      <View>
        {OPTIONS.map((option) => (
          <SelectionCard
            key={option.id}
            label={option.label}
            onPress={() => handleSelect(option.id)}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}
