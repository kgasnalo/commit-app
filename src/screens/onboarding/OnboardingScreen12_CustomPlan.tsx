import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, typography, spacing, borderRadius } from '../../theme';

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KRW: '₩',
};

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <OnboardingLayout
      currentStep={12}
      totalSteps={14}
      title="あなたのCOMMIT"
      subtitle="これが、あなたが自分に課した約束。"
      footer={
        <PrimaryButton
          label="この約束を有効化する"
          onPress={() => navigation.navigate('Onboarding13')}
        />
      }
    >
      <View style={styles.commitCard}>
        <View style={styles.commitItem}>
          <Ionicons name="book" size={24} color={colors.accent.primary} />
          <View style={styles.commitContent}>
            <Text style={styles.commitLabel}>読む本</Text>
            <Text style={styles.commitValue} numberOfLines={2}>
              {selectedBook?.volumeInfo?.title || '未選択'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commitItem}>
          <Ionicons name="time" size={24} color={colors.accent.primary} />
          <View style={styles.commitContent}>
            <Text style={styles.commitLabel}>期限</Text>
            <Text style={styles.commitValue}>{formatDate(deadline)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commitItem}>
          <Ionicons name="heart" size={24} color={colors.accent.primary} />
          <View style={styles.commitContent}>
            <Text style={styles.commitLabel}>覚悟金</Text>
            <Text style={styles.commitValue}>
              {CURRENCY_SYMBOLS[currency] || '¥'}{pledgeAmount?.toLocaleString()}
            </Text>
            <Text style={styles.commitNote}>Room to Readに届けられます</Text>
          </View>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  commitCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  commitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  commitContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  commitLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: 4,
  },
  commitValue: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
  },
  commitNote: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
});
