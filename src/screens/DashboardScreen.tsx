import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import { GlassTile } from '../components/titan/GlassTile';
import { MetricDisplay } from '../components/titan/MetricDisplay';
import { StatusIndicator } from '../components/titan/StatusIndicator';

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

  // Cinematic fade-in from black
  const [showFadeOverlay, setShowFadeOverlay] = useState(false);
  const fadeOverlayOpacity = useSharedValue(1);

  const fadeOverlayStyle = useAnimatedStyle(() => ({
    opacity: fadeOverlayOpacity.value,
  }));

  useEffect(() => {
    fetchCommitments();
    fetchUserProfile();

    const checkFadeIn = async () => {
      const shouldFade = await AsyncStorage.getItem('showDashboardFadeIn');
      if (shouldFade === 'true') {
        await AsyncStorage.removeItem('showDashboardFadeIn');
        setShowFadeOverlay(true);
        fadeOverlayOpacity.value = 1;
        setTimeout(() => {
          fadeOverlayOpacity.value = withTiming(0, {
            duration: 1000,
            easing: Easing.out(Easing.cubic),
          });
        }, 200);
        setTimeout(() => {
          setShowFadeOverlay(false);
        }, 1200);
      }
    };
    checkFadeIn();

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

  useFocusEffect(
    React.useCallback(() => {
      setCurrentLocale(i18n.locale);
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('username').eq('id', user.id).single();
        let name = data?.username;
        if (!name) name = user.email?.split('@')[0];
        setUserName(name || 'Guest');
      }
    } catch (e) {
      console.log('Error fetching profile:', e);
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

  const renderHistoryCard = (commitment: Commitment) => {
      return (
          <View key={commitment.id} style={styles.historyRow}>
             <View style={styles.historyInfo}>
                 <Text style={styles.historyTitle}>{commitment.book.title}</Text>
                 <Text style={styles.historyDate}>{new Date(commitment.created_at).toLocaleDateString()}</Text>
             </View>
             <TacticalText style={styles.historyAmount} color={colors.text.muted}>
                 -{commitment.currency === 'JPY' ? '¥' : commitment.currency}{commitment.pledge_amount.toLocaleString()}
             </TacticalText>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      
      {/* Header: Executive Cockpit Style */}
      <View style={styles.header}>
        <View>
          <StatusIndicator
            status={groupedCommitments.filter(g => g.activeCount > 0).length > 0 ? 'active' : 'dormant'}
            label={groupedCommitments.filter(g => g.activeCount > 0).length > 0
              ? i18n.t('dashboard.status_active')
              : i18n.t('dashboard.status_dormant')}
          />
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('RoleSelect')}
        >
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
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
        {/* Stats: Glass Tile Panel */}
        <GlassTile
          variant="elevated"
          glow={Object.values(poolByCurrency).some(v => v > 0) ? 'gold' : 'none'}
          padding="lg"
          style={styles.statsPanel}
        >
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MetricDisplay
                label={i18n.t('dashboard.donation_pool')}
                value={Object.entries(poolByCurrency)
                  .filter(([_, amount]) => amount > 0)
                  .map(([currency, amount]) => {
                    const symbol = CURRENCY_SYMBOLS[currency] || currency;
                    return `${symbol}${amount.toLocaleString()}`;
                  })
                  .join(' + ') || '¥0'}
                size="medium"
                color={colors.text.primary}
              />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <MetricDisplay
                label={i18n.t('dashboard.total_donated')}
                value={Object.entries(donatedByCurrency)
                  .filter(([_, amount]) => amount > 0)
                  .map(([currency, amount]) => {
                    const symbol = CURRENCY_SYMBOLS[currency] || currency;
                    return `${symbol}${amount.toLocaleString()}`;
                  })
                  .join(' + ') || '¥0'}
                size="medium"
                color={colors.text.muted}
              />
            </View>
          </View>
        </GlassTile>

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
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '300',
    marginTop: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glassSubtle,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  statsPanel: {
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.subtle,
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    marginBottom: 16,
    color: colors.text.muted,
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
    color: colors.text.secondary,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.background.card,
    ...shadows.glassSubtle,
  },
  emptyButtonText: {
    color: colors.text.primary, 
    fontSize: 14,
  },
  historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
      color: colors.text.secondary,
      fontSize: 14,
      marginBottom: 4,
  },
  historyDate: {
      color: colors.text.muted,
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
