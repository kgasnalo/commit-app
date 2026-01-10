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

  // Calculate stats for grid display
  const activeCommitmentsCount = groupedCommitments.filter(g => g.activeCount > 0).length;
  const completedCount = commitments.filter(c => c.status === 'completed').length;
  const failedCount = commitments.filter(c => c.status === 'defaulted').length;

  const totalPool = Object.entries(poolByCurrency)
    .filter(([_, amount]) => amount > 0)
    .map(([currency, amount]) => {
      const symbol = CURRENCY_SYMBOLS[currency] || currency;
      return `${symbol}${amount.toLocaleString()}`;
    })
    .join(' + ') || '¥0';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0B09" />

      {/* Deep Orange-Brown Background - 参考デザインの深いオレンジ世界 */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        {/* Base: Deep brown gradient */}
        <LinearGradient
          colors={[
            'rgba(40, 25, 15, 0.9)',     // 深いオレンジブラウン（上部）
            'rgba(25, 18, 12, 0.95)',
            'rgba(13, 11, 9, 1)',        // ベース暖色ダーク
          ]}
          locations={[0, 0.4, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Overlay: Strong orange glow from top */}
        <LinearGradient
          colors={[
            'rgba(255, 107, 53, 0.25)',  // 強いオレンジグロー
            'rgba(255, 140, 80, 0.12)',
            'rgba(255, 107, 53, 0.05)',
            'transparent',
          ]}
          locations={[0, 0.15, 0.4, 0.7]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.8 }}
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('RoleSelect')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
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
        {/* Stats Grid: Reference Design Style */}
        <View style={styles.statsGrid}>
          {/* Main Pool - Glowing Tile (最強調) */}
          <GlassTile
            variant="glowing"
            innerGlow="strong"
            padding="xl"
            borderRadius={28}
            topBorder="orange"
            style={styles.mainStatTile}
          >
            <Text style={styles.statLabel}>{i18n.t('dashboard.donation_pool')}</Text>
            <Text style={styles.mainStatValue}>{totalPool}</Text>
          </GlassTile>

          {/* Secondary Stats - Grid (控えめな発光) */}
          <View style={styles.secondaryStatsRow}>
            <GlassTile
              variant="default"
              innerGlow="orange"
              padding="md"
              borderRadius={20}
              slashLight={true}
              style={styles.smallStatTile}
            >
              <Text style={styles.smallStatValue}>{activeCommitmentsCount}</Text>
              <Text style={styles.smallStatLabel}>{i18n.t('dashboard.active_short') || 'Active'}</Text>
            </GlassTile>

            <GlassTile
              variant="default"
              innerGlow="orange"
              padding="md"
              borderRadius={20}
              slashLight={true}
              style={styles.smallStatTile}
            >
              <Text style={styles.smallStatValue}>{completedCount}</Text>
              <Text style={styles.smallStatLabel}>{i18n.t('dashboard.completed_short') || 'Done'}</Text>
            </GlassTile>
          </View>

          <View style={styles.secondaryStatsRow}>
            <GlassTile
              variant="default"
              innerGlow="orange"
              padding="md"
              borderRadius={20}
              slashLight={true}
              style={styles.smallStatTile}
            >
              <Text style={[styles.smallStatValue, failedCount > 0 && styles.dangerValue]}>
                {failedCount}
              </Text>
              <Text style={styles.smallStatLabel}>{i18n.t('dashboard.failed_short') || 'Failed'}</Text>
            </GlassTile>

            <GlassTile
              variant="default"
              innerGlow="orange"
              padding="md"
              borderRadius={20}
              slashLight={true}
              style={styles.smallStatTile}
            >
              <Text style={styles.smallStatValue}>
                {Object.entries(donatedByCurrency)
                  .filter(([_, amount]) => amount > 0)
                  .map(([currency, amount]) => {
                    const symbol = CURRENCY_SYMBOLS[currency] || currency;
                    return `${symbol}${Math.floor(amount / 1000)}k`;
                  })
                  .join('+') || '¥0'}
              </Text>
              <Text style={styles.smallStatLabel}>{i18n.t('dashboard.donated_short') || 'Donated'}</Text>
            </GlassTile>
          </View>
        </View>

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
    backgroundColor: '#0D0B09', // 暖色系ダーク（参考デザイン）
  },
  ambientGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH * 1.0, // 拡大
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
    fontWeight: '300',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35', // オレンジ塗りつぶし（参考デザイン）
    justifyContent: 'center',
    alignItems: 'center',
    // オレンジグロー
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 1,
  },

  // Stats Grid - Reference Design Style
  statsGrid: {
    marginBottom: 32,
    gap: 12,
  },
  mainStatTile: {
    minHeight: 120,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
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
  secondaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallStatTile: {
    flex: 1,
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallStatValue: {
    fontSize: 32,
    color: '#FAFAFA',
    fontWeight: '200',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  smallStatLabel: {
    fontSize: 11,
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
