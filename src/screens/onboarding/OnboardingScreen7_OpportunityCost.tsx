import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing } from '../../theme';

export default function OnboardingScreen7({ navigation, route }: any) {
  return (
    <OnboardingLayout
      currentStep={7}
      totalSteps={13}
      title="読まなかった1冊は、得られなかった1つの武器。"
      subtitle="知識は複利で効く。1年後、差がつく。"
      footer={
        <PrimaryButton
          label="次へ"
          onPress={() => navigation.navigate('Onboarding8', route.params)}
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
