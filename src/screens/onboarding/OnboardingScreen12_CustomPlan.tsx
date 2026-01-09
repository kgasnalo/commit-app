import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import BlueprintCard from '../../components/onboarding/BlueprintCard';
import { spacing } from '../../theme';
import i18n from '../../i18n';

export default function OnboardingScreen12({ navigation, route }: any) {
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [deadline, setDeadline] = useState<string>('');
  const [pledgeAmount, setPledgeAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('JPY');

  // オンボーディングデータを読み込む
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        // route.paramsがあればそれを使用（直接遷移の場合）
        if (route.params?.selectedBook) {
          setSelectedBook(route.params.selectedBook);
          setDeadline(route.params.deadline);
          setPledgeAmount(route.params.pledgeAmount);
          setCurrency(route.params.currency || 'JPY');
        } else {
          // route.paramsがない場合、AsyncStorageから読み込む（認証後のスタック切り替え後）
          const data = await AsyncStorage.getItem('onboardingData');
          if (data) {
            const parsed = JSON.parse(data);
            setSelectedBook(parsed.selectedBook);
            setDeadline(parsed.deadline);
            setPledgeAmount(parsed.pledgeAmount);
            setCurrency(parsed.currency || 'JPY');
            console.log('Onboarding data loaded from AsyncStorage');
          } else {
            console.warn('No onboarding data found in AsyncStorage');
          }
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      }
    };

    loadOnboardingData();
  }, [route.params]);

  // Navigate to next screen after animation completes
  const handleAnimationComplete = useCallback(() => {
    navigation.navigate('Onboarding13');
  }, [navigation]);

  return (
    <OnboardingLayout
      currentStep={12}
      totalSteps={14}
      title={i18n.t('onboarding.screen12_title')}
      subtitle={i18n.t('onboarding.screen12_subtitle')}
    >
      <View style={styles.container}>
        <BlueprintCard
          bookTitle={selectedBook?.volumeInfo?.title || i18n.t('onboarding.screen12_not_selected')}
          deadline={deadline}
          pledgeAmount={pledgeAmount}
          currency={currency}
          onAnimationComplete={handleAnimationComplete}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
