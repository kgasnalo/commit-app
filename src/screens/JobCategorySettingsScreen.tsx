/**
 * JobCategorySettingsScreen
 * 設定画面から職種を変更するための画面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../theme';
import { HapticsService } from '../lib/HapticsService';
import { captureError } from '../utils/errorLogger';
import i18n from '../i18n';
import type { JobCategory } from '../types';

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

export default function JobCategorySettingsScreen({ navigation }: any) {
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);
  const [originalCategory, setOriginalCategory] = useState<JobCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCurrentJobCategory();
  }, []);

  const fetchCurrentJobCategory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('job_category')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const category = data?.job_category as JobCategory | null;
      setSelectedCategory(category);
      setOriginalCategory(category);
    } catch (error) {
      captureError(error, { location: 'JobCategorySettingsScreen.fetchCurrentJobCategory' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = useCallback((category: JobCategory) => {
    HapticsService.feedbackSelection();
    setSelectedCategory(category);
  }, []);

  const handleSave = useCallback(async () => {
    if (selectedCategory === originalCategory) {
      navigation.goBack();
      return;
    }

    HapticsService.feedbackMedium();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ job_category: selectedCategory })
        .eq('id', user.id);

      if (error) throw error;

      HapticsService.feedbackSuccess();
      navigation.goBack();
    } catch (error) {
      captureError(error, { location: 'JobCategorySettingsScreen.handleSave' });
      Alert.alert(i18n.t('common.error'), i18n.t('errors.unknown'));
    } finally {
      setSaving(false);
    }
  }, [navigation, selectedCategory, originalCategory]);

  const hasChanges = selectedCategory !== originalCategory;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backgroundContainer} pointerEvents="none">
          <LinearGradient
            colors={['#1A1008', '#100A06', '#080604']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.muted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255, 160, 120, 0.15)', 'rgba(255, 160, 120, 0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.job_category')}</Text>
        <TouchableOpacity
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.saveText, !hasChanges && styles.saveTextDisabled]}>
              {i18n.t('common.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={styles.description}>{i18n.t('settings.job_category_description')}</Text>

      {/* Job Category Grid */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.accent.primary,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  description: {
    color: colors.text.muted,
    fontSize: typography.fontSize.body,
    paddingHorizontal: 20,
    marginBottom: spacing.lg,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
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
});
