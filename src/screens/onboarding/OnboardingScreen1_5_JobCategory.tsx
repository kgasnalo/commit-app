/**
 * OnboardingScreen1_5_JobCategory
 * 職種選択画面 - 「同じ職種の人が読んでる本」機能のための職種収集
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { HapticsService } from '../../lib/HapticsService';
import { captureError } from '../../utils/errorLogger';
import i18n from '../../i18n';
import type { JobCategory } from '../../types';

// 職種オプション定義
const JOB_CATEGORIES: { value: JobCategory; icon: string }[] = [
  { value: 'engineer', icon: '💻' },
  { value: 'designer', icon: '🎨' },
  { value: 'pm', icon: '📋' },
  { value: 'marketing', icon: '📣' },
  { value: 'sales', icon: '🤝' },
  { value: 'hr', icon: '👥' },
  { value: 'cs', icon: '💬' },
  { value: 'founder', icon: '🚀' },
  { value: 'other', icon: '✨' },
];

export default function OnboardingScreen1_5({ navigation, route }: any) {
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);

  // 前の画面からのパラメータを引き継ぐ
  const { tsundokuCount } = route.params || {};

  const handleSelect = useCallback((category: JobCategory) => {
    HapticsService.feedbackSelection();
    setSelectedCategory(category);
  }, []);

  const handleNext = useCallback(async () => {
    HapticsService.feedbackMedium();

    // AsyncStorageに職種を一時保存（アカウント作成時にDBに保存される）
    if (selectedCategory) {
      try {
        const existingData = await AsyncStorage.getItem('onboardingData');
        let data: Record<string, unknown> = {};
        if (existingData) {
          try {
            data = JSON.parse(existingData);
          } catch (parseError) {
            captureError(parseError, {
              location: 'OnboardingScreen1_5.handleNext',
              extra: { action: 'parse_onboarding_data' },
            });
            // Continue with empty object if parse fails
          }
        }
        data.jobCategory = selectedCategory;
        await AsyncStorage.setItem('onboardingData', JSON.stringify(data));
      } catch (error) {
        captureError(error, {
          location: 'OnboardingScreen1_5.handleNext',
          extra: { action: 'save_job_category' },
        });
      }
    }

    navigation.navigate('Onboarding2', { tsundokuCount, jobCategory: selectedCategory });
  }, [navigation, selectedCategory, tsundokuCount]);

  const handleSkip = useCallback(() => {
    HapticsService.feedbackLight();
    navigation.navigate('Onboarding2', { tsundokuCount, jobCategory: null });
  }, [navigation, tsundokuCount]);

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={15}
      title={i18n.t('onboarding.job_category_title')}
      subtitle={i18n.t('onboarding.job_category_subtitle')}
      footer={
        <View style={styles.footerContainer}>
          <PrimaryButton
            label={i18n.t('onboarding.next')}
            onPress={handleNext}
            disabled={!selectedCategory}
          />
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>{i18n.t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {JOB_CATEGORIES.map((category, index) => {
          const isSelected = selectedCategory === category.value;
          return (
            <Animated.View
              key={category.value}
              entering={FadeInUp.delay(index * 50).duration(300)}
              style={styles.cardWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                ]}
                onPress={() => handleSelect(category.value)}
                activeOpacity={0.8}
              >
                {isSelected && (
                  <LinearGradient
                    colors={['rgba(255, 107, 53, 0.2)', 'rgba(255, 107, 53, 0.05)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Text style={styles.cardIcon}>{category.icon}</Text>
                <Text style={[
                  styles.cardLabel,
                  isSelected && styles.cardLabelSelected,
                ]}>
                  {i18n.t(`onboarding.job_categories.${category.value}`)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  cardLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  cardLabelSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  footerContainer: {
    gap: spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.body,
    textDecorationLine: 'underline',
  },
});
