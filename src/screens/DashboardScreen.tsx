import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useFocusEffect } from '@react-navigation/native';
import CommitmentCard from '../components/CommitmentCard';
import {
  calculatePageRangesForAll,
  groupCommitmentsByBook,
  GroupedBookCommitments,
  RawCommitmentWithBook,
  CommitmentWithRange,
} from '../lib/commitmentHelpers';
import { NotificationService } from '../lib/NotificationService';
import { colors, typography, spacing, shadows } from '../theme';
import { titanColors, titanTypography } from '../theme/titan';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import { GlassTile } from '../components/titan/GlassTile';
import { MetricDisplay } from '../components/titan/MetricDisplay';
import { StatusIndicator } from '../components/titan/StatusIndicator';
import { MonkModeService, StreakStats } from '../lib/MonkModeService';
// CardRegistrationBanner and DonationAnnouncementModal removed for App Review compliance (Guideline 3.2.2)
import { captureError } from '../utils/errorLogger';
import { WidgetService } from '../lib/WidgetService';
import JobRecommendations from '../components/JobRecommendations';
import type { JobCategory } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BookData = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
};

type Commitment = {
  id: string;
  book_id: string;
  book: BookData;
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  target_pages: number;
  created_at: string;
};

// Supabase join query returns book as array or single object
type CommitmentQueryResult = Omit<Commitment, 'book'> & {
  book: BookData | BookData[];
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KRW: '₩',
};

export default function DashboardScreen({ navigation }: any) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [groupedCommitments, setGroupedCommitments] = useState<GroupedBookCommitments[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [poolByCurrency, setPoolByCurrency] = useState<Record<string, number>>({});
  const [donatedByCurrency, setDonatedByCurrency] = useState<Record<string, number>>({});
  const [currentLocale, setCurrentLocale] = useState(i18n.locale);
  const [userName, setUserName] = useState<string>('Guest');
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [rankingPosition, setRankingPosition] = useState<number | null>(null);
  const [jobCategory, setJobCategory] = useState<JobCategory | null | undefined>(undefined);

  // Cinematic fade-in from black
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayOpacity = useSharedValue(1);

  const fadeOverlayStyle = useAnimatedStyle(() => ({
    opacity: fadeOverlayOpacity.value,
  }));

  // Refresh data on every screen focus to prevent stale data after navigation
  // Empty deps is intentional: we always want fresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        await Promise.all([
          fetchCommitments(),
          fetchUserProfile(),
          fetchStreakStats(),
          fetchRankingPosition(),
        ]);
        setCurrentLocale(i18n.locale);
      };
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchStreakStats = async () => {
    try {
      const stats = await MonkModeService.getStreakStats();
      setStreakStats(stats);
    } catch (error) {
      console.warn('[Dashboard] Failed to fetch streak stats:', error);
    }
  };

  const fetchRankingPosition = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch all completed commitments for this month with show_in_ranking = true
      const { data, error } = await supabase
        .from('commitments')
        .select(`
          user_id,
          users!inner(id, show_in_ranking)
        `)
        .eq('status', 'completed')
        .eq('users.show_in_ranking', true)
        .gte('completed_at', startOfMonth.toISOString());

      if (error) throw error;

      // Group by user_id and count
      const userCounts: Record<string, number> = {};
      if (data) {
        data.forEach((item: any) => {
          const uid = item.user_id;
          userCounts[uid] = (userCounts[uid] || 0) + 1;
        });
      }

      // Convert to sorted array
      const sortedUsers = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a);

      // Find current user's position (1-indexed)
      let position: number | null = null;
      let currentRank = 1;
      let prevCount = -1;

      for (let i = 0; i < sortedUsers.length; i++) {
        const [uid, count] = sortedUsers[i];
        if (count !== prevCount) {
          currentRank = i + 1;
          prevCount = count;
        }
        if (uid === user.id) {
          position = currentRank;
          break;
        }
      }

      setRankingPosition(position);
    } catch (error) {
      console.warn('[Dashboard] Failed to fetch ranking position:', error);
    }
  };

  // Track all timers for cleanup
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Clear any existing timers from previous renders
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];

    const checkFadeIn = async () => {
      try {
        const shouldFade = await AsyncStorage.getItem('showDashboardFadeIn');
        if (!isMountedRef.current) return;

        if (shouldFade === 'true') {
          await AsyncStorage.removeItem('showDashboardFadeIn');
          if (!isMountedRef.current) return;

          setShowFadeOverlay(true);
          fadeOverlayOpacity.value = 1;

          const fadeStartTimer = setTimeout(() => {
            if (!isMountedRef.current) return;
            fadeOverlayOpacity.value = withTiming(0, {
              duration: 1000,
              easing: Easing.out(Easing.cubic),
            });
          }, 200);
          timersRef.current.push(fadeStartTimer);

          const fadeEndTimer = setTimeout(() => {
            if (!isMountedRef.current) return;
            setShowFadeOverlay(false);
          }, 1200);
          timersRef.current.push(fadeEndTimer);
        }
      } catch (error) {
        console.warn('[Dashboard] checkFadeIn error:', error);
      }
    };
    checkFadeIn();

    const initNotifications = async () => {
      try {
        await NotificationService.initialize();
        if (!isMountedRef.current) return;
        await NotificationService.scheduleAllNotifications();
      } catch (error) {
        console.warn('[Dashboard] Notification initialization failed:', error);
      }
    };
    initNotifications();

    return () => {
      isMountedRef.current = false;
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('username, payment_method_registered, job_category')
          .eq('id', user.id)
          .maybeSingle();
        let name = data?.username;
        if (!name) name = user.email?.split('@')[0];
        setUserName(name || 'Guest');
        setJobCategory(data?.job_category as JobCategory | null);
      }
    } catch (e) {
      // Silently fail for profile fetch
    }
  };

  const fetchCommitments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('commitments')
        .select(`
          id,
          book_id,
          deadline,
          status,
          pledge_amount,
          currency,
          target_pages,
          created_at,
          book:books(id, title, author, cover_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (data) {
        const queryResults = data as CommitmentQueryResult[];
        const normalizedData: Commitment[] = queryResults.map((c) => ({
          ...c,
          book: Array.isArray(c.book) ? c.book[0] : c.book,
        }));
        setCommitments(normalizedData);

        const transformedData: RawCommitmentWithBook[] = normalizedData.map((c) => ({
          ...c,
          book: c.book,
        }));
        const withRanges = calculatePageRangesForAll(transformedData);
        const grouped = groupCommitmentsByBook(withRanges);
        setGroupedCommitments(grouped);

        const pending = data.filter(c => c.status === 'pending');
        const defaulted = data.filter(c => c.status === 'defaulted');

        const poolByC = pending.reduce((acc, c) => {
          const currency = c.currency || 'JPY';
          acc[currency] = (acc[currency] || 0) + (c.pledge_amount || 0);
          return acc;
        }, {} as Record<string, number>);

        const donatedByC = defaulted.reduce((acc, c) => {
          const currency = c.currency || 'JPY';
          acc[currency] = (acc[currency] || 0) + (c.pledge_amount || 0);
          return acc;
        }, {} as Record<string, number>);

        setPoolByCurrency(poolByC);
        setDonatedByCurrency(donatedByC);

        // Update iOS home screen widget with first active commitment
        const activeCommitment = normalizedData.find(c => c.status === 'pending');
        if (activeCommitment) {
          // Calculate pages read from verification logs
          const { data: verificationLogs } = await supabase
            .from('verification_logs')
            .select('commitment_id')
            .eq('commitment_id', activeCommitment.id);
          const pagesRead = (verificationLogs?.length || 0) * Math.ceil(activeCommitment.target_pages / 10);

          WidgetService.updateWidget({
            bookTitle: activeCommitment.book.title,
            bookAuthor: activeCommitment.book.author,
            bookCoverUrl: activeCommitment.book.cover_url,
            deadline: activeCommitment.deadline,
            pagesRead: Math.min(pagesRead, activeCommitment.target_pages),
            totalPages: activeCommitment.target_pages,
            hasActiveCommitment: true,
          });
        } else {
          WidgetService.clearWidget();
        }
      }
    } catch (error) {
      captureError(error, { location: 'DashboardScreen.fetchCommitments' });
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommitments();
  };

  const renderHistoryCard = (commitment: Commitment) => {
      return (
          <View key={commitment.id} style={styles.historyRow}>
             <View style={styles.historyInfo}>
                 <Text style={styles.historyTitle}>{commitment.book.title}</Text>
                 <Text style={styles.historyDate}>{new Date(commitment.created_at).toLocaleDateString()}</Text>
             </View>
             {/* Pledge amount hidden for App Review compliance */}
          </View>
      )
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.initialLoadingContainer}>
          <ActivityIndicator size="small" color={colors.text.muted} />
        </View>
      </SafeAreaView>
    );
  }

  // Calculate stats for grid display
  const activeCommitmentsCount = groupedCommitments.filter(g => g.activeCount > 0).length;
  const completedCount = commitments.filter(c => c.status === 'completed').length;
  const failedCount = commitments.filter(c => c.status === 'defaulted').length;

  // Split currency symbol and amount for typography styling
  const poolDisplay = Object.entries(poolByCurrency)
    .filter(([_, amount]) => amount > 0)
    .map(([currency, amount]) => ({
      symbol: CURRENCY_SYMBOLS[currency] || currency,
      amount: amount.toLocaleString(),
    }));

  const hasPool = poolDisplay.length > 0;
  const primaryPool = hasPool ? poolDisplay[0] : { symbol: '¥', amount: '0' };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* Finexaスタイル: 黒ベース + 右上〜左下への対角オレンジグラデーション */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        {/* Layer 1: 黒ベース */}
        <LinearGradient
          colors={['#0A0A0A', '#080808', '#060606', '#050505']}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 2: 右上からのオレンジグラデーション（Finexaの青をトレース） */}
        <LinearGradient
          colors={[
            'rgba(255, 120, 80, 0.12)',
            'rgba(255, 100, 60, 0.06)',
            'transparent',
          ]}
          locations={[0, 0.4, 0.8]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 3: 左下への補助グラデーション */}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 100, 60, 0.04)',
            'rgba(255, 80, 40, 0.08)',
          ]}
          locations={[0.3, 0.6, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header: Executive Cockpit Style */}
      <View style={styles.header}>
        <View>
          <StatusIndicator
            status={activeCommitmentsCount > 0 ? 'active' : 'dormant'}
            label={activeCommitmentsCount > 0
              ? i18n.t('dashboard.status_active')
              : i18n.t('dashboard.status_dormant')}
          />
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('SettingsTab', { screen: 'Profile' })}
          >
            <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('RoleSelect')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.muted}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Badges Row - Streak & Ranking */}
        <View style={styles.badgeRow}>
          {/* Streak Counter - Duolingo Style */}
          {streakStats && streakStats.currentStreak > 0 && (
            <TouchableOpacity
              style={styles.streakBadge}
              onPress={() => navigation.navigate('SettingsTab', { screen: 'Profile' })}
              activeOpacity={0.8}
            >
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakCount}>{streakStats.currentStreak}</Text>
              <Text style={styles.streakLabel}>{i18n.t('dashboard.streak_days')}</Text>
            </TouchableOpacity>
          )}

          {/* Ranking Badge - Always visible */}
          <TouchableOpacity
            style={styles.rankingBadge}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.rankingEmoji}>🏆</Text>
            <Text style={styles.rankingPosition}>
              {rankingPosition ? `#${rankingPosition}` : '#-'}
            </Text>
            <Text style={styles.rankingLabel}>{i18n.t('dashboard.ranking_this_month')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid: Reference Design Style */}
        <View style={styles.statsGrid}>
          {/* Finexaスタイル: 円形ボタン横並び */}
          <View style={styles.circleButtonRow}>
            {/* 進行中 */}
            <View style={styles.circleButtonContainer}>
              <View style={[
                styles.circleButton,
                activeCommitmentsCount > 0 && styles.circleButtonActive,
              ]}>
                <Ionicons
                  name="hourglass-outline"
                  size={24}
                  color={activeCommitmentsCount > 0 ? '#FF6B35' : 'rgba(255, 255, 255, 0.5)'}
                />
              </View>
              <Text style={styles.circleButtonValue}>{activeCommitmentsCount}</Text>
              <Text style={styles.circleButtonLabel}>{i18n.t('dashboard.active_short') || 'Active'}</Text>
            </View>

            {/* 完了 */}
            <View style={styles.circleButtonContainer}>
              <View style={[
                styles.circleButton,
                completedCount > 0 && styles.circleButtonActive,
              ]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color={completedCount > 0 ? '#FF6B35' : 'rgba(255, 255, 255, 0.5)'}
                />
              </View>
              <Text style={styles.circleButtonValue}>{completedCount}</Text>
              <Text style={styles.circleButtonLabel}>{i18n.t('dashboard.completed_short') || 'Done'}</Text>
            </View>

            {/* 失敗 */}
            <View style={styles.circleButtonContainer}>
              <View style={[
                styles.circleButton,
                failedCount > 0 && styles.circleButtonDanger,
              ]}>
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={failedCount > 0 ? '#FF6B6B' : 'rgba(255, 255, 255, 0.5)'}
                />
              </View>
              <Text style={[styles.circleButtonValue, failedCount > 0 && styles.dangerValue]}>
                {failedCount}
              </Text>
              <Text style={styles.circleButtonLabel}>{i18n.t('dashboard.failed_short') || 'Failed'}</Text>
            </View>

            {/* Donated circle removed for App Review compliance */}
          </View>
        </View>

        {/* Job Recommendations - Only show if job_category is set or undefined (loading) */}
        {jobCategory !== null && (
          <JobRecommendations
            jobCategory={jobCategory}
            onBookPress={(book) => {
              navigation.navigate('LibraryTab', {
                screen: 'BookDetail',
                params: { bookId: book.book_id },
              });
            }}
            onSetJobCategory={() => {
              navigation.navigate('SettingsTab', { screen: 'JobCategorySettings' });
            }}
            onViewAll={() => {
              navigation.navigate('JobRanking', { jobCategory });
            }}
          />
        )}

        {/* Active Commitments */}
        <View style={styles.section}>
          <MicroLabel style={styles.sectionTitle}>{i18n.t('dashboard.active_commitments') || 'Active Commitments'}</MicroLabel>

          {groupedCommitments.filter(g => g.activeCount > 0).length === 0 ? (
            <GlassTile variant="subtle" padding="lg" style={styles.emptyState}>
              <Text style={styles.emptySubtitle}>{i18n.t('dashboard.no_active_commitments')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('RoleSelect')}
              >
                <Text style={styles.emptyButtonText}>{i18n.t('dashboard.create_new')}</Text>
              </TouchableOpacity>
            </GlassTile>
          ) : (
            groupedCommitments
              .filter(g => g.activeCount > 0)
              .map(group => (
                <CommitmentCard
                  key={group.bookId}
                  commitment={group.mostRecentCommitment}
                  activeCount={group.activeCount}
                  onPress={() => navigation.navigate('CommitmentDetail', {
                    id: group.mostRecentCommitment.id
                  })}
                />
              ))
          )}
        </View>

        {/* Failed History */}
        {commitments.filter(c => c.status === 'defaulted').length > 0 && (
          <View style={styles.section}>
            <MicroLabel style={styles.sectionTitle}>{i18n.t('dashboard.failed_history') || 'History'}</MicroLabel>
            {commitments
              .filter(c => c.status === 'defaulted')
              .map(renderHistoryCard)}
          </View>
        )}
      </ScrollView>

      {/* Cinematic fade-in overlay */}
      {showFadeOverlay && (
        <Animated.View style={[styles.fadeOverlay, fadeOverlayStyle]} pointerEvents="none" />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505', // Finexaスタイル: 純粋な黒
  },
  ambientGlowContainer: {
    ...StyleSheet.absoluteFillObject, // 全画面カバー
    zIndex: 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  userName: {
    fontSize: 26,
    color: '#FAFAFA',
    fontWeight: '400',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35', // オレンジ塗りつぶし（参考デザイン）
    justifyContent: 'center',
    alignItems: 'center',
    // 強いOuter Glow - ボタン自体が光源となる演出
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 1,
  },

  // Badge Row
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  // Streak Badge - Duolingo Style
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },

  // Ranking Badge
  rankingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  rankingEmoji: {
    fontSize: 18,
  },
  rankingPosition: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
    fontVariant: ['tabular-nums'],
  },
  rankingLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },

  // Stats Grid - Reference Design Style
  statsGrid: {
    marginBottom: 32,
    gap: 12,
  },
  mainStatTile: {
    minHeight: 120,
    justifyContent: 'center',
    // Finexaスタイル: オレンジボーダーグロー
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  mainStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 36, // 数字の約65%
    color: 'rgba(255, 255, 255, 0.7)', // やや薄く
    fontWeight: '400', // 細め
    marginRight: 4,
    // 微妙なグロー
    textShadowColor: 'rgba(255, 107, 53, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mainStatValue: {
    fontSize: 56,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    // 数字に微妙なグロー効果
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  additionalCurrency: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
    marginLeft: 8,
  },
  // Finexaスタイル: 円形ボタン
  circleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  circleButtonContainer: {
    alignItems: 'center',
    gap: 8,
  },
  circleButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(30, 30, 30, 0.95)', // Finexaスタイル: ニュートラルダーク
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // 薄い白ボーダー
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleButtonActive: {
    borderColor: 'rgba(255, 107, 53, 0.4)', // アクティブ時のみオレンジ
    // オレンジグロー
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  circleButtonDanger: {
    borderColor: 'rgba(255, 107, 107, 0.4)',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.25,
  },
  circleButtonValue: {
    fontSize: 18,
    color: '#FAFAFA',
    fontWeight: '600',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  circleButtonLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  dangerValue: {
    color: '#FF6B6B',
  },

  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  emptyButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  historyDate: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  historyAmount: {
    fontSize: 14,
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
});
