import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import SelectionCard from '../../components/onboarding/SelectionCard';
import { colors, typography, spacing } from '../../theme';

const OPTIONS = [
  { id: '1-week', label: '1週間', days: 7 },
  { id: '2-weeks', label: '2週間', days: 14 },
  { id: '3-weeks', label: '3週間', days: 21 },
  { id: '1-month', label: '1ヶ月', days: 30 },
];

export default function OnboardingScreen4({ navigation, route }: any) {
  const { selectedBook } = route.params;

  const handleSelect = (option: typeof OPTIONS[0]) => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + option.days);
    navigation.navigate('Onboarding5', { selectedBook, deadline: deadline.toISOString() });
  };

  return (
    <OnboardingLayout
      currentStep={4}
      totalSteps={14}
      title="いつまでに読み切る？"
      subtitle="締切がないから、読めない。"
    >
      <View>
        {OPTIONS.map((option) => (
          <SelectionCard
            key={option.id}
            label={option.label}
            onPress={() => handleSelect(option)}
          />
        ))}
      </View>
      <Text style={styles.note}>いつまでに読むか、コミット宣言をしろ。</Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
