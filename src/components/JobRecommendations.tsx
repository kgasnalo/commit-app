/**
 * JobRecommendations Component
 *
 * Displays book recommendations based on the user's job category.
 * Shows "Popular among [job category]" section with horizontally scrollable book cards.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../theme';
import { ensureHttps } from '../utils/googleBooks';
import { captureError } from '../utils/errorLogger';
import { useLanguage } from '../contexts/LanguageContext';
import i18n from '../i18n';
import type { JobCategory } from '../types';

interface RecommendedBook {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  google_books_id: string | null;
  read_count: number;
}

interface JobRecommendationsProps {
  jobCategory: JobCategory | null | undefined;
  onBookPress?: (book: RecommendedBook) => void;
  onSetJobCategory?: () => void;
  onViewAll?: () => void;
}

const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  engineer: 'onboarding.job_categories.engineer',
  designer: 'onboarding.job_categories.designer',
  pm: 'onboarding.job_categories.pm',
  marketing: 'onboarding.job_categories.marketing',
  sales: 'onboarding.job_categories.sales',
  hr: 'onboarding.job_categories.hr',
  cs: 'onboarding.job_categories.cs',
  founder: 'onboarding.job_categories.founder',
  other: 'onboarding.job_categories.other',
};

const JOB_CATEGORY_ICONS: Record<JobCategory, string> = {
  engineer: '💻',
  designer: '🎨',
  pm: '📋',
  marketing: '📣',
  sales: '🤝',
  hr: '👥',
  cs: '💬',
  founder: '🚀',
  other: '✨',
};

export default function JobRecommendations({
  jobCategory,
  onBookPress,
  onSetJobCategory,
  onViewAll,
}: JobRecommendationsProps) {
  const { language } = useLanguage();
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!jobCategory) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'job-recommendations',
        {
          body: { job_category: jobCategory, limit: 10 },
        }
      );

      if (invokeError) {
        throw invokeError;
      }

      if (data?.success && data.data?.recommendations) {
        setRecommendations(data.data.recommendations);
      } else if (data?.data?.message === 'NOT_ENOUGH_DATA') {
        setRecommendations([]);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      captureError(err, { location: 'JobRecommendations.fetchRecommendations' });
      setError('FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  }, [jobCategory]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // If no job category is set, show prompt to set one
  if (!jobCategory) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{i18n.t('recommendations.set_job_category')}</Text>
          {onSetJobCategory && (
            <TouchableOpacity style={styles.setButton} onPress={onSetJobCategory}>
              <Text style={styles.setButtonText}>
                {i18n.t('recommendations.set_job_category_button')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {JOB_CATEGORY_ICONS[jobCategory]} {i18n.t('recommendations.job_title', {
              jobCategory: i18n.t(JOB_CATEGORY_LABELS[jobCategory]),
            })}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return null; // Silently hide on error
  }

  // No recommendations available - hide completely
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>
            {JOB_CATEGORY_ICONS[jobCategory]} {i18n.t('recommendations.job_title', {
              jobCategory: i18n.t(JOB_CATEGORY_LABELS[jobCategory]),
            })}
          </Text>
          <Text style={styles.subtitle}>{i18n.t('recommendations.job_subtitle')}</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>{i18n.t('recommendations.view_all')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((book, index) => (
          <Animated.View
            key={book.book_id}
            entering={FadeInRight.delay(index * 100).duration(300)}
          >
            <TouchableOpacity
              style={styles.bookCard}
              onPress={() => onBookPress?.(book)}
              activeOpacity={0.8}
            >
              <View style={styles.coverContainer}>
                {book.cover_url ? (
                  <Image
                    source={{ uri: ensureHttps(book.cover_url) ?? undefined }}
                    style={styles.cover}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Text style={styles.coverPlaceholderText}>
                      {book.title.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {book.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {book.author}
              </Text>
              <Text style={styles.readCount}>
                {i18n.t('recommendations.read_count', { count: book.read_count })}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  viewAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    color: colors.accent.primary,
    fontSize: typography.fontSize.caption,
    fontWeight: '600',
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  bookCard: {
    width: 120,
    backgroundColor: 'rgba(26, 23, 20, 0.6)',
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    color: colors.text.muted,
    fontSize: 24,
    fontWeight: '600',
  },
  bookTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.caption,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 2,
  },
  bookAuthor: {
    color: colors.text.muted,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  readCount: {
    color: colors.accent.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.fontSize.body,
    textAlign: 'center',
  },
  setButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent.primary,
    borderRadius: 20,
  },
  setButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.body,
    fontWeight: '600',
  },
});
