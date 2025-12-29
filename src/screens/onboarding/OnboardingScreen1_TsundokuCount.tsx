import React from 'react';
import { View } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SelectionCard from '../../components/onboarding/SelectionCard';

const OPTIONS = [
  { id: '1-3', label: '1〜3冊' },
  { id: '4-10', label: '4〜10冊' },
  { id: '10+', label: '10冊以上' },
  { id: 'unknown', label: '数えたくない' },
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
      title="積読、何冊ありますか？"
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
