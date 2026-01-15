import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import BlueprintCard from '../../components/onboarding/BlueprintCard';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { spacing } from '../../theme';
import i18n from '../../i18n';

export default function OnboardingScreen12({ navigation, route }: any) {
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [deadline, setDeadline] = useState<string>('');
  const [pledgeAmount, setPledgeAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('JPY');
  const [animationComplete, setAnimationComplete] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);

  // オンボーディングデータを読み込む
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        let bookData = null;

        // route.paramsがあればそれを使用（直接遷移の場合）
        if (route.params?.selectedBook) {
          bookData = route.params.selectedBook;
          setSelectedBook(bookData);
          setDeadline(route.params.deadline);
          setPledgeAmount(route.params.pledgeAmount);
          setCurrency(route.params.currency || 'JPY');
        } else {
          // route.paramsがない場合、AsyncStorageから読み込む（認証後のスタック切り替え後）
          const data = await AsyncStorage.getItem('onboardingData');
          if (data) {
            const parsed = JSON.parse(data);
            bookData = parsed.selectedBook;
            setSelectedBook(bookData);
            setDeadline(parsed.deadline);
            setPledgeAmount(parsed.pledgeAmount);
            setCurrency(parsed.currency || 'JPY');
          } else {
            console.warn('No onboarding data found in AsyncStorage in Screen12');
          }
        }

        // Google Books APIから本の詳細を取得してpageCountを設定
        if (bookData?.id) {
          try {
            console.log('[Screen12] Fetching book detail for pageCount:', bookData.id);
            const response = await fetch(
              `https://www.googleapis.com/books/v1/volumes/${bookData.id}`
            );
            const detail = await response.json();
            const count = detail?.volumeInfo?.pageCount;
            if (count && count > 0) {
              console.log('[Screen12] Got pageCount from API:', count);
              setPageCount(count);
            } else {
              // pageCountがない場合のフォールバック
              console.log('[Screen12] No pageCount in API, using fallback: 100');
              setPageCount(100);
            }
          } catch (fetchError) {
            console.warn('[Screen12] Failed to fetch book detail:', fetchError);
            setPageCount(100);
          }
        } else {
          // bookDataがない場合もフォールバック
          setPageCount(100);
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
        setPageCount(100);
      }
    };

    loadOnboardingData();
  }, [route.params]);

  // アニメーション完了時にボタンを有効化
  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true);
  }, []);

  // 次の画面に遷移（ボタンタップ時）
  const handleProceed = useCallback(() => {
    console.log('[Screen12] Navigating to Screen13 with targetPages:', pageCount || 100);
    navigation.navigate('Onboarding13', {
      selectedBook,
      deadline,
      pledgeAmount,
      currency,
      targetPages: pageCount || 100,
    });
  }, [navigation, selectedBook, deadline, pledgeAmount, currency, pageCount]);

  return (
    <OnboardingLayout
      currentStep={12}
      totalSteps={14}
      title={i18n.t('onboarding.screen12_title')}
      subtitle={i18n.t('onboarding.screen12_subtitle')}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.screen12_activate')}
          onPress={handleProceed}
          disabled={!animationComplete}
        />
      }
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
