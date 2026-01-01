import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

type Commitment = {
  id: string;
  book: {
    title: string;
    author: string;
    cover_url: string;
  };
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  created_at: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [poolByCurrency, setPoolByCurrency] = useState<Record<string, number>>({});
  const [donatedByCurrency, setDonatedByCurrency] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCommitments();
  }, []);

  const fetchCommitments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('commitments')
        .select(`
          id,
          deadline,
          status,
          pledge_amount,
          currency,
          created_at,
          book:books(title, author, cover_url)
        `)
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (data) {
        setCommitments(data as any);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('dashboard.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
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

          {commitments.filter(c => c.status === 'pending').length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{i18n.t('dashboard.no_commitments', { defaultValue: '進行中のコミットメントはありません' })}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('RoleSelect')}
              >
                <Text style={styles.addButtonText}>{i18n.t('dashboard.add_book', { defaultValue: '本を追加する' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            commitments
              .filter(c => c.status === 'pending')
              .map(renderCommitmentCard)
          )}
        </View>

        {/* 完了・失敗した本 */}
        {commitments.filter(c => c.status !== 'pending').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('dashboard.history', { defaultValue: '履歴' })}</Text>
            {commitments
              .filter(c => c.status !== 'pending')
              .map(renderCommitmentCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
  },
  addButton: {
    marginTop: 16,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
