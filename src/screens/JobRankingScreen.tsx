/**
 * JobRankingScreen
 * 職種別の人気書籍ランキング詳細画面
 * 全期間/月間タブでTop10を表示
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { invokeFunctionWithRetry } from '../lib/supabaseHelpers';
import i18n from '../i18n';
import { colors, typography, spacing } from '../theme';
import { ensureHttps } from '../utils/googleBooks';
import { captureError } from '../utils/errorLogger';
import type { JobCategory } from '../types';

interface RankedBook {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  google_books_id: string | null;
  read_count: number;
  rank: number;
}

type Period = 'alltime' | 'month';

const JOB_CATEGORIES: JobCategory[] = [
  'engineer', 'designer', 'pm', 'marketing',
  'sales', 'hr', 'cs', 'founder', 'other'
];

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

export default function JobRankingScreen({ navigation, route }: any) {
  const { jobCategory: initialJobCategory } = route.params || {};
  const [selectedJobCategory, setSelectedJobCategory] = useState<JobCategory>(
    (initialJobCategory as JobCategory) || 'engineer'
  );
  const [period, setPeriod] = useState<Period>('alltime');
  const [books, setBooks] = useState<RankedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRankings = useCallback(async (selectedPeriod: Period, category: JobCategory) => {
    if (!category) return;

    try {
      setLoading(true);

      // WORKER_ERROR 対策としてリトライロジックを使用
      const { data, error } = await invokeFunctionWithRetry<{
        success: boolean;
        data?: {
          recommendations?: Omit<RankedBook, 'rank'>[];
        };
      }>('job-recommendations', {
        job_category: category,
        limit: 10,
        period: selectedPeriod,
      });

      if (error) throw error;

      if (data?.success && data.data?.recommendations) {
        // Add rank to each book
        const rankedBooks: RankedBook[] = data.data.recommendations.map(
          (book: Omit<RankedBook, 'rank'>, index: number) => ({
            ...book,
            rank: index + 1,
          })
        );
        setBooks(rankedBooks);
      } else {
        setBooks([]);
      }
    } catch (error) {
      captureError(error, { location: 'JobRankingScreen.fetchRankings' });
      setBooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRankings(period, selectedJobCategory);
    }, [fetchRankings, period, selectedJobCategory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRankings(period, selectedJobCategory);
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    fetchRankings(newPeriod, selectedJobCategory);
  };

  const handleJobCategoryChange = (category: JobCategory) => {
    setSelectedJobCategory(category);
    fetchRankings(period, category);
  };

  const handleBookPress = (book: RankedBook) => {
    navigation.navigate('LibraryTab', {
      screen: 'BookDetail',
      params: { bookId: book.book_id },
    });
  };

  const renderBookItem = ({ item, index }: { item: RankedBook; index: number }) => {
    const isTop3 = item.rank <= 3;
    const rankEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : null;

    return (
      <TouchableOpacity
        style={styles.bookItem}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.8}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {rankEmoji ? (
            <Text style={[styles.rankEmoji, isTop3 && styles.rankEmojiLarge]}>{rankEmoji}</Text>
          ) : (
            <Text style={styles.rankNumber}>
              {i18n.t('jobRanking.rank_label', { rank: item.rank })}
            </Text>
          )}
        </View>

        {/* Book Cover */}
        <View style={styles.coverContainer}>
          {item.cover_url ? (
            <Image
              source={{ uri: ensureHttps(item.cover_url) ?? undefined }}
              style={styles.cover}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.coverPlaceholderText}>
                {item.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Book Info */}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          <Text style={styles.readCount}>
            {i18n.t('jobRanking.readers_count', { count: item.read_count })}
          </Text>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>{i18n.t('jobRanking.empty_title')}</Text>
      <Text style={styles.emptySubtitle}>{i18n.t('jobRanking.empty_subtitle')}</Text>
    </View>
  );

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {i18n.t('jobRanking.all_jobs_title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Job Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.jobTabsContainer}
        contentContainerStyle={styles.jobTabsContent}
      >
        {JOB_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.jobTab, selectedJobCategory === cat && styles.jobTabActive]}
            onPress={() => handleJobCategoryChange(cat)}
          >
            <Text style={[styles.jobTabText, selectedJobCategory === cat && styles.jobTabTextActive]}>
              {JOB_CATEGORY_ICONS[cat]} {i18n.t(JOB_CATEGORY_LABELS[cat])}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, period === 'alltime' && styles.tabActive]}
          onPress={() => handlePeriodChange('alltime')}
        >
          <Text style={[styles.tabText, period === 'alltime' && styles.tabTextActive]}>
            {i18n.t('jobRanking.tab_alltime')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, period === 'month' && styles.tabActive]}
          onPress={() => handlePeriodChange('month')}
        >
          <Text style={[styles.tabText, period === 'month' && styles.tabTextActive]}>
            {i18n.t('jobRanking.tab_month')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.muted} />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.book_id}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text.muted}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
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
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  jobTabsContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  jobTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  jobTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  jobTabActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: 'rgba(255, 107, 53, 0.5)',
  },
  jobTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  jobTabTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#1A1714',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tabTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankEmojiLarge: {
    fontSize: 24,
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  coverContainer: {
    width: 50,
    height: 75,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: spacing.md,
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
    fontSize: 18,
    fontWeight: '600',
  },
  bookInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  bookTitle: {
    fontSize: typography.fontSize.body,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: typography.fontSize.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
  },
  readCount: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
