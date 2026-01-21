import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors } from '../theme';
import { GlassTile } from '../components/titan/GlassTile';
import { MicroLabel } from '../components/titan/MicroLabel';
import { captureError } from '../utils/errorLogger';

interface RankingEntry {
  userId: string;
  username: string;
  completedCount: number;
  rank: number;
}

type Period = 'month' | 'year';

const MAX_RANKING_DISPLAY = 100; // Maximum number of users to display in the ranking list

export default function LeaderboardScreen({ navigation }: any) {
  const [period, setPeriod] = useState<Period>('month');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myCount, setMyCount] = useState<number>(0);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUser();
      fetchRankings(period);
    }, [period])
  );

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      captureError(error, { location: 'LeaderboardScreen.fetchCurrentUser' });
    }
  };

  const fetchRankings = async (selectedPeriod: Period) => {
    try {
      setLoading(true);

      // Get the start date for the period
      const now = new Date();
      let startDate: Date;
      if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Fetch completed commitments with user data
      const { data, error } = await supabase
        .from('commitments')
        .select(`
          user_id,
          users!inner(id, username, show_in_ranking)
        `)
        .eq('status', 'completed')
        .eq('users.show_in_ranking', true)
        .gte('completed_at', startDate.toISOString());

      if (error) throw error;

      // Get current user's data
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Group by user_id and count
      const userCounts: Record<string, { count: number; username: string }> = {};

      if (data) {
        data.forEach((item: any) => {
          const uid = item.user_id;
          const userData = Array.isArray(item.users) ? item.users[0] : item.users;
          const username = userData?.username || 'Anonymous';

          if (!userCounts[uid]) {
            userCounts[uid] = { count: 0, username };
          }
          userCounts[uid].count++;
        });
      }

      // Convert to array and sort by count
      const sortedEntries = Object.entries(userCounts)
        .map(([uid, { count, username }]) => ({
          userId: uid,
          username,
          completedCount: count,
          rank: 0,
        }))
        .sort((a, b) => b.completedCount - a.completedCount);

      // Assign ranks (handle ties)
      let currentRank = 1;
      for (let i = 0; i < sortedEntries.length; i++) {
        if (i > 0 && sortedEntries[i].completedCount < sortedEntries[i - 1].completedCount) {
          currentRank = i + 1;
        }
        sortedEntries[i].rank = currentRank;
      }

      setTotalParticipants(sortedEntries.length);

      // Find current user's rank (before limiting to top 100)
      if (userId) {
        const myEntry = sortedEntries.find(e => e.userId === userId);
        if (myEntry) {
          setMyRank(myEntry.rank);
          setMyCount(myEntry.completedCount);
        } else {
          // User hasn't completed any books in this period
          setMyRank(null);
          setMyCount(0);
        }
      }

      // Limit display to top 100
      setRankings(sortedEntries.slice(0, MAX_RANKING_DISPLAY));
    } catch (error) {
      captureError(error, { location: 'LeaderboardScreen.fetchRankings' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRankings(period);
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    fetchRankings(newPeriod);
  };

  const renderPodium = () => {
    if (rankings.length === 0) return null;

    const top3 = rankings.slice(0, 3);
    const first = top3[0];
    const second = top3[1];
    const third = top3[2];

    return (
      <View style={styles.podiumContainer}>
        {/* Second Place (Left) */}
        {second && (
          <View style={[styles.podiumItem, styles.podiumSecond]}>
            <Text style={styles.podiumMedal}>🥈</Text>
            <Text style={styles.podiumUsername} numberOfLines={1}>{second.username}</Text>
            <Text style={styles.podiumCount}>
              {i18n.t('leaderboard.books_count', { count: second.completedCount })}
            </Text>
          </View>
        )}

        {/* First Place (Center) */}
        {first && (
          <View style={[styles.podiumItem, styles.podiumFirst]}>
            <Text style={styles.podiumMedalFirst}>🥇</Text>
            <Text style={styles.podiumUsernameFirst} numberOfLines={1}>{first.username}</Text>
            <Text style={styles.podiumCountFirst}>
              {i18n.t('leaderboard.books_count', { count: first.completedCount })}
            </Text>
          </View>
        )}

        {/* Third Place (Right) */}
        {third && (
          <View style={[styles.podiumItem, styles.podiumThird]}>
            <Text style={styles.podiumMedal}>🥉</Text>
            <Text style={styles.podiumUsername} numberOfLines={1}>{third.username}</Text>
            <Text style={styles.podiumCount}>
              {i18n.t('leaderboard.books_count', { count: third.completedCount })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRankingItem = (item: RankingEntry, index: number) => {
    const isCurrentUser = item.userId === currentUserId;

    return (
      <View
        key={item.userId}
        style={[
          styles.rankingItem,
          isCurrentUser && styles.rankingItemHighlight,
        ]}
      >
        <Text style={styles.rankNumber}>#{item.rank}</Text>
        <View style={styles.rankUserInfo}>
          <Text style={[styles.rankUsername, isCurrentUser && styles.rankUsernameHighlight]} numberOfLines={1}>
            {item.username}
            {isCurrentUser && (
              <Text style={styles.youMarker}> {i18n.t('leaderboard.you_marker')}</Text>
            )}
          </Text>
        </View>
        <Text style={styles.rankCount}>
          {i18n.t('leaderboard.books_count', { count: item.completedCount })}
        </Text>
      </View>
    );
  };

  const renderMyStats = () => {
    return (
      <GlassTile
        variant="default"
        innerGlow="orange"
        padding="lg"
        borderRadius={20}
        style={styles.myStatsTile}
      >
        <MicroLabel style={styles.myStatsLabel}>
          {i18n.t('leaderboard.your_stats')}
        </MicroLabel>
        <Text style={styles.myStatsRank}>
          {myRank
            ? i18n.t('leaderboard.rank_format', { rank: myRank, total: totalParticipants })
            : '#-'}
        </Text>
        <Text style={styles.myStatsCount}>
          {i18n.t('leaderboard.completed_count', { count: myCount })}
        </Text>
      </GlassTile>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyTitle}>{i18n.t('leaderboard.empty_title')}</Text>
        <Text style={styles.emptySubtitle}>{i18n.t('leaderboard.empty_subtitle')}</Text>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>{i18n.t('leaderboard.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Period Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, period === 'month' && styles.tabActive]}
          onPress={() => handlePeriodChange('month')}
        >
          <Text style={[styles.tabText, period === 'month' && styles.tabTextActive]}>
            {i18n.t('leaderboard.tab_month')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, period === 'year' && styles.tabActive]}
          onPress={() => handlePeriodChange('year')}
        >
          <Text style={[styles.tabText, period === 'year' && styles.tabTextActive]}>
            {i18n.t('leaderboard.tab_year')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.muted} />
        </View>
      ) : (
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
          {rankings.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* Podium */}
              {renderPodium()}

              {/* Ranking List (4th place onwards) */}
              {rankings.length > 3 && (
                <View style={styles.rankingList}>
                  {rankings.slice(3).map((item, index) => renderRankingItem(item, index + 3))}
                </View>
              )}

              {/* My Stats Card */}
              {renderMyStats()}
            </>
          )}
        </ScrollView>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    paddingTop: 20,
  },
  podiumItem: {
    alignItems: 'center',
    width: 100,
  },
  podiumFirst: {
    marginBottom: 20,
  },
  podiumSecond: {
    marginRight: 8,
  },
  podiumThird: {
    marginLeft: 8,
  },
  podiumMedal: {
    fontSize: 36,
    marginBottom: 8,
  },
  podiumMedalFirst: {
    fontSize: 48,
    marginBottom: 8,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  podiumUsername: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    maxWidth: 90,
  },
  podiumUsernameFirst: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    maxWidth: 90,
  },
  podiumCount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  podiumCountFirst: {
    fontSize: 15,
    color: '#FFD700',
    fontWeight: '600',
  },
  // Ranking List
  rankingList: {
    marginBottom: 24,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rankingItemHighlight: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderBottomWidth: 1,
  },
  rankNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rankUserInfo: {
    flex: 1,
  },
  rankUsername: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  rankUsernameHighlight: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  youMarker: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '400',
  },
  rankCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  // My Stats
  myStatsTile: {
    marginTop: 8,
    alignItems: 'center',
  },
  myStatsLabel: {
    marginBottom: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  myStatsRank: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  myStatsCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // Empty State
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
