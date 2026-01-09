import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
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

  // Cinematic fade-in from black (after 007-style reveal)
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayOpacity = useSharedValue(1);

  const fadeOverlayStyle = useAnimatedStyle(() => ({
    opacity: fadeOverlayOpacity.value,
  }));

  useEffect(() => {
    fetchCommitments();

    // Check if we're coming from the cinematic reveal
    const checkFadeIn = async () => {
      const shouldFade = await AsyncStorage.getItem('showDashboardFadeIn');
      if (shouldFade === 'true') {
        await AsyncStorage.removeItem('showDashboardFadeIn');
        setShowFadeOverlay(true);
        fadeOverlayOpacity.value = 1;

        // Delay before starting fade out (let the screen settle)
        setTimeout(() => {
          fadeOverlayOpacity.value = withTiming(0, {
            duration: 800,
            easing: Easing.out(Easing.cubic),
          });
        }, 200);

        // Hide overlay after animation completes
        setTimeout(() => {
          setShowFadeOverlay(false);
        }, 1200);
      }
    };
    checkFadeIn();

    // Initialize and schedule notifications (Phase 4.1 - Dynamic Pacemaker)
    const initNotifications = async () => {
      try {
        await NotificationService.initialize();
        await NotificationService.scheduleAllNotifications();
      } catch (error) {
        console.warn('[Dashboard] Notification initialization failed:', error);
      }
    };
    initNotifications();
  }, []);

  // Update locale when screen is focused to reflect language changes
  useFocusEffect(
    React.useCallback(() => {
      setCurrentLocale(i18n.locale);
    }, [])
  );

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
        // Transform data to ensure book is a single object (not array from Supabase join)
        const queryResults = data as CommitmentQueryResult[];
        const normalizedData: Commitment[] = queryResults.map((c) => ({
          ...c,
          book: Array.isArray(c.book) ? c.book[0] : c.book,
        }));
        setCommitments(normalizedData);

        // Calculate page ranges and group by book
        const transformedData: RawCommitmentWithBook[] = normalizedData.map((c) => ({
          ...c,
          book: c.book,
        }));
        const withRanges = calculatePageRangesForAll(transformedData);
        const grouped = groupCommitmentsByBook(withRanges);
        setGroupedCommitments(grouped);

        // 通貨ごとに集計
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
      }
    } catch (error) {
      console.error('Error fetching commitments:', error);
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommitments();
  };

  const getCountdown = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, expired: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { days, hours, expired: false };
  };

  const renderCommitmentCard = (commitment: Commitment) => {
    const countdown = getCountdown(commitment.deadline);
    const isUrgent = countdown.days <= 3 && !countdown.expired;

    return (
      <TouchableOpacity
        key={commitment.id}
        style={[styles.card, isUrgent && styles.urgentCard]}
        onPress={() => {
          navigation.navigate('CommitmentDetail', { id: commitment.id });
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {commitment.book.title}
          </Text>
          <View style={[
            styles.statusBadge,
            commitment.status === 'completed' && styles.completedBadge,
            commitment.status === 'defaulted' && styles.defaultedBadge,
          ]}>
            <Text style={styles.statusText}>
              {commitment.status === 'pending' ? i18n.t('dashboard.in_progress') :
               commitment.status === 'completed' ? i18n.t('dashboard.completed') : i18n.t('dashboard.failed')}
            </Text>
          </View>
        </View>

        {commitment.status === 'pending' && (
          <View style={styles.countdown}>
            <Ionicons
              name="time-outline"
              size={20}
              color={isUrgent ? '#ff6b6b' : '#666'}
            />
            <Text style={[styles.countdownText, isUrgent && styles.urgentText]}>
              {countdown.expired
                ? i18n.t('dashboard.failed')
                : `${i18n.t('dashboard.remaining')} ${countdown.days}${i18n.t('dashboard.days')} ${countdown.hours}${i18n.t('dashboard.hours')}`}
            </Text>
          </View>
        )}

        <Text style={styles.pledgeAmount}>
          {i18n.t('dashboard.penalty')}: {commitment.currency === 'JPY' ? '¥' : commitment.currency}
          {commitment.pledge_amount.toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{i18n.t('dashboard.title')}</Text>
        </View>
        <View style={styles.initialLoadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.initialLoadingText}>{i18n.t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('dashboard.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 統計カード */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{i18n.t('dashboard.donation_pool')}</Text>
            <Text style={styles.statValue}>
              {Object.entries(poolByCurrency)
                .filter(([_, amount]) => amount > 0)
                .map(([currency, amount]) => {
                  const symbol = CURRENCY_SYMBOLS[currency] || currency;
                  return `${symbol}${amount.toLocaleString()}`;
                })
                .join(' + ') || '¥0'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{i18n.t('dashboard.total_donated')}</Text>
            <Text style={styles.statValue}>
              {Object.entries(donatedByCurrency)
                .filter(([_, amount]) => amount > 0)
                .map(([currency, amount]) => {
                  const symbol = CURRENCY_SYMBOLS[currency] || currency;
                  return `${symbol}${amount.toLocaleString()}`;
                })
                .join(' + ') || '¥0'}
            </Text>
          </View>
        </View>

        {/* コミットメント一覧 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('dashboard.active_commitments')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RoleSelect')}>
              <MaterialIcons name="add" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          {groupedCommitments.filter(g => g.activeCount > 0).length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="book-outline" size={56} color="#ccc" />
              </View>
              <Text style={styles.emptyTitle}>{i18n.t('dashboard.no_commitments')}</Text>
              <Text style={styles.emptySubtitle}>{i18n.t('dashboard.empty_encouragement')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('RoleSelect')}
              >
                <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>{i18n.t('dashboard.add_book')}</Text>
              </TouchableOpacity>
            </View>
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

        {/* 完了・失敗した本 */}
        {commitments.filter(c => c.status === 'defaulted').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('dashboard.history')}</Text>
            {commitments
              .filter(c => c.status === 'defaulted')
              .map(renderCommitmentCard)}
          </View>
        )}
      </ScrollView>

      {/* Cinematic fade-in overlay (from 007-style reveal) */}
      {showFadeOverlay && (
        <Animated.View style={[styles.fadeOverlay, fadeOverlayStyle]} pointerEvents="none" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  content: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
  },
  defaultedBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 14,
    color: '#666',
  },
  urgentText: {
    color: '#ff6b6b',
    fontWeight: '600',
  },
  pledgeAmount: {
    fontSize: 14,
    color: '#666',
  },
  initialLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
    elevation: 9999,
  },
});
