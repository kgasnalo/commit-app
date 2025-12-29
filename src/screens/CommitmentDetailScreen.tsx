import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type CommitmentDetail = {
  id: string;
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  created_at: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string;
  };
};

export default function CommitmentDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [commitment, setCommitment] = useState<CommitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommitment();
  }, []);

  const fetchCommitment = async () => {
    try {
      const { data, error } = await supabase
        .from('commitments')
        .select(`
          id,
          deadline,
          status,
          pledge_amount,
          currency,
          created_at,
          book:books(id, title, author, cover_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setCommitment(data as any);
      }
    } catch (error) {
      console.error('Error fetching commitment:', error);
      Alert.alert(
        'エラー',
        'コミットメント情報の取得に失敗しました。',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getCountdown = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, expired: false };
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      JPY: '¥', USD: '$', EUR: '€', GBP: '£', CNY: '¥', KRW: '₩'
    };
    return symbols[currency] || currency;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  if (!commitment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>エラー</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>コミットメントが見つかりません</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const countdown = getCountdown(commitment.deadline);
  const isUrgent = countdown.days <= 3 && !countdown.expired;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>コミットメント詳細</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* 書籍情報 */}
        <View style={styles.bookCard}>
          {commitment.book.cover_url ? (
            <Image source={{ uri: commitment.book.cover_url }} style={styles.bookCover} />
          ) : (
            <View style={styles.bookCoverPlaceholder}>
              <Ionicons name="book-outline" size={40} color="#ccc" />
            </View>
          )}
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{commitment.book.title}</Text>
            <Text style={styles.bookAuthor}>{commitment.book.author}</Text>
          </View>
        </View>

        {/* ステータス */}
        <View style={[
          styles.statusBadge,
          commitment.status === 'completed' && styles.completedBadge,
          commitment.status === 'defaulted' && styles.defaultedBadge,
        ]}>
          <Text style={styles.statusText}>
            {commitment.status === 'pending' ? '進行中' :
             commitment.status === 'completed' ? '読了完了' : '期限切れ'}
          </Text>
        </View>

        {/* カウントダウン */}
        {commitment.status === 'pending' && (
          <View style={[styles.countdownCard, isUrgent && styles.urgentCard]}>
            <Text style={styles.countdownLabel}>期限まで</Text>
            {countdown.expired ? (
              <Text style={styles.expiredText}>期限切れ</Text>
            ) : (
              <View style={styles.countdownNumbers}>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.days}
                  </Text>
                  <Text style={styles.countdownUnit}>日</Text>
                </View>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.hours}
                  </Text>
                  <Text style={styles.countdownUnit}>時間</Text>
                </View>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.minutes}
                  </Text>
                  <Text style={styles.countdownUnit}>分</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ペナルティ金額 */}
        <View style={styles.penaltyCard}>
          <Text style={styles.penaltyLabel}>ペナルティ金額</Text>
          <Text style={styles.penaltyAmount}>
            {getCurrencySymbol(commitment.currency)}{commitment.pledge_amount.toLocaleString()}
          </Text>
          <Text style={styles.penaltyNote}>
            期限までに読了確認ができない場合、この金額が課金されます
          </Text>
        </View>

        {/* アクションボタン */}
        {commitment.status === 'pending' && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => navigation.navigate('Verification', {
              commitmentId: commitment.id,
              bookTitle: commitment.book.title,
            })}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.verifyButtonText}>読了確認する</Text>
          </TouchableOpacity>
        )}

        {commitment.status === 'completed' && (
          <View style={styles.completedMessage}>
            <Ionicons name="checkmark-circle" size={48} color="#4caf50" />
            <Text style={styles.completedText}>読了完了しました！</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  bookCoverPlaceholder: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
  },
  defaultedBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countdownCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  urgentCard: {
    backgroundColor: '#fff5f5',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  countdownNumbers: {
    flexDirection: 'row',
    gap: 24,
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  countdownUnit: {
    fontSize: 14,
    color: '#666',
  },
  urgentText: {
    color: '#ff6b6b',
  },
  expiredText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff6b6b',
  },
  penaltyCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  penaltyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  penaltyAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  penaltyNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  completedMessage: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completedText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#4caf50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
