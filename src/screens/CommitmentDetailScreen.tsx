import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors, typography } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';

type BookData = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
};

type CommitmentDetail = {
  id: string;
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  created_at: string;
  target_pages: number;
  is_freeze_used: boolean;
  book: BookData;
};

type CommitmentQueryResult = Omit<CommitmentDetail, 'book'> & {
  book: BookData | BookData[];
};

export default function CommitmentDetailScreen({ route, navigation }: any) {
  const id = route?.params?.id;
  const [commitment, setCommitment] = useState<CommitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lifelineUsedForBook, setLifelineUsedForBook] = useState(false);
  const [lifelineLoading, setLifelineLoading] = useState(false);

  const fetchCommitment = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

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
          target_pages,
          is_freeze_used,
          book:books(id, title, author, cover_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const queryResult = data as CommitmentQueryResult;
        const normalizedData: CommitmentDetail = {
          ...queryResult,
          book: Array.isArray(queryResult.book) ? queryResult.book[0] : queryResult.book,
        };
        setCommitment(normalizedData);
      }
    } catch (error) {
      console.error('[CommitmentDetailScreen] Fetch error:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.fetch_commitment_failed'),
        [{ text: i18n.t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    fetchCommitment();
  }, [fetchCommitment]);

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

  const checkLifelineAvailability = useCallback(async (bookId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('commitments')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('book_id', bookId)
        .eq('is_freeze_used', true)
        .limit(1);

      if (error) throw error;
      setLifelineUsedForBook(data && data.length > 0);
    } catch (error) {
      console.error('[CommitmentDetailScreen] Lifeline check error:', error);
    }
  }, []);

  const handleUseLifeline = async () => {
    if (!commitment) return;

    Alert.alert(
      i18n.t('commitment_detail.lifeline_confirm_title'),
      i18n.t('commitment_detail.lifeline_confirm_message'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.ok'),
          onPress: async () => {
            setLifelineLoading(true);
            try {
              const { data, error } = await supabase.functions.invoke('use-lifeline', {
                body: { commitment_id: commitment.id },
              });

              if (error) {
                if (error instanceof FunctionsHttpError) {
                  const errorBody = await error.context.json();
                  throw new Error(errorBody.error || 'Unknown error');
                }
                throw error;
              }

              if (data?.success) {
                Alert.alert(i18n.t('common.success'), i18n.t('commitment_detail.lifeline_success'));
                fetchCommitment();
                setLifelineUsedForBook(true);
              } else if (data?.error) {
                Alert.alert(i18n.t('common.error'), data.error);
              }
            } catch (error: any) {
              console.error('[CommitmentDetailScreen] Lifeline error:', error);
              Alert.alert(
                i18n.t('common.error'),
                error.message || i18n.t('commitment_detail.lifeline_already_used')
              );
            } finally {
              setLifelineLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (commitment?.book?.id) {
      checkLifelineAvailability(commitment.book.id);
    }
  }, [commitment?.book?.id, checkLifelineAvailability]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.text.muted} />
      </SafeAreaView>
    );
  }

  if (!commitment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{i18n.t('errors.commitment_not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const countdown = getCountdown(commitment.deadline);
  const isUrgent = countdown.days <= 3 && !countdown.expired;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('commitment_detail.title')}</Text>
        <View style={styles.backButton} /> 
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Header */}
        <View style={styles.bookHeader}>
          <View style={styles.bookCoverContainer}>
              {commitment.book.cover_url ? (
                <Image source={{ uri: commitment.book.cover_url }} style={styles.bookCover} />
              ) : (
                <View style={styles.bookCoverPlaceholder}>
                  <Ionicons name="book-outline" size={40} color={colors.text.muted} />
                </View>
              )}
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{commitment.book.title}</Text>
            <Text style={styles.bookAuthor}>{commitment.book.author}</Text>
            <View style={[
              styles.statusChip, 
              commitment.status === 'completed' && styles.statusChipCompleted,
              commitment.status === 'defaulted' && styles.statusChipFailed
            ]}>
                <Text style={[
                  styles.statusChipText,
                   commitment.status === 'completed' && { color: '#000' }
                ]}>
                    {commitment.status === 'pending' ? 'IN PROGRESS' : commitment.status.toUpperCase()}
                </Text>
            </View>
          </View>
        </View>

        {/* Data List */}
        <View style={styles.dataSection}>
            {commitment.target_pages > 0 && (
                <View style={styles.dataRow}>
                    <MicroLabel>{i18n.t('commitment_detail.target_pages')}</MicroLabel>
                    <TacticalText size={16} color={colors.text.primary}>
                        {commitment.target_pages.toLocaleString()} Pages
                    </TacticalText>
                </View>
            )}

            <View style={styles.dataRow}>
                <MicroLabel>PLEDGED AMOUNT</MicroLabel>
                <TacticalText size={16} color={colors.text.primary}>
                     {getCurrencySymbol(commitment.currency)}{commitment.pledge_amount.toLocaleString()}
                </TacticalText>
            </View>

            <View style={styles.dataRow}>
                <MicroLabel>DEADLINE</MicroLabel>
                <TacticalText size={16} color={colors.text.primary}>
                     {new Date(commitment.deadline).toLocaleDateString()}
                </TacticalText>
            </View>
        </View>

        {/* Countdown */}
        {commitment.status === 'pending' && (
          <View style={styles.countdownSection}>
            <MicroLabel style={{ marginBottom: 12 }}>REMAINING TIME</MicroLabel>
            {countdown.expired ? (
              <Text style={styles.expiredText}>EXPIRED</Text>
            ) : (
              <View style={styles.countdownNumbers}>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.days}
                  </Text>
                  <Text style={styles.countdownUnit}>DAYS</Text>
                </View>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.hours}
                  </Text>
                  <Text style={styles.countdownUnit}>HOURS</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionButtonsContainer}>
          {commitment.status === 'pending' && (
            <>
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => navigation.navigate('Verification', {
                  commitmentId: commitment.id,
                  bookTitle: commitment.book.title,
                })}
              >
                <Text style={styles.verifyButtonText}>{i18n.t('commitment_detail.verify_button')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                    styles.secondaryButton,
                    lifelineUsedForBook && styles.secondaryButtonDisabled
                ]}
                onPress={handleUseLifeline}
                disabled={lifelineUsedForBook || lifelineLoading}
              >
                {lifelineLoading ? (
                  <ActivityIndicator size="small" color={colors.text.secondary} />
                ) : (
                  <Text style={[
                      styles.secondaryButtonText,
                      lifelineUsedForBook && styles.secondaryButtonTextDisabled
                  ]}>
                    {lifelineUsedForBook ? 'FREEZE USED' : 'USE FREEZE (+7 DAYS)'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {commitment.status === 'completed' && (
            <View style={styles.completedMessage}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.signal.success} />
              <Text style={styles.completedText}>{i18n.t('commitment_detail.completed_message')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
      width: 40,
      alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  bookHeader: {
      flexDirection: 'row',
      marginBottom: 40,
  },
  bookCoverContainer: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
  },
  bookCover: {
    width: 90,
    height: 135,
    borderRadius: 4,
  },
  bookCoverPlaceholder: {
    width: 90,
    height: 135,
    borderRadius: 4,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 26,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  statusChip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.background.tertiary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 100,
  },
  statusChipCompleted: {
      backgroundColor: colors.signal.success,
  },
  statusChipFailed: {
      backgroundColor: 'rgba(128, 0, 0, 0.2)',
  },
  statusChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
  },
  dataSection: {
      marginBottom: 40,
  },
  dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
  },
  countdownSection: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: colors.background.card,
    padding: 24,
    borderRadius: 8,
  },
  countdownNumbers: {
    flexDirection: 'row',
    gap: 40,
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownValue: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.text.primary,
  },
  countdownUnit: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  urgentText: {
    color: colors.signal.danger,
    fontWeight: '500',
  },
  expiredText: {
    fontSize: 24,
    color: colors.signal.danger,
  },
  actionButtonsContainer: {
    gap: 16,
  },
  verifyButton: {
    backgroundColor: colors.text.primary, // White button
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.bright,
  },
  secondaryButtonDisabled: {
      borderColor: colors.border.subtle,
      opacity: 0.5,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  secondaryButtonTextDisabled: {
      color: colors.text.muted,
  },
  completedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderRadius: 8,
  },
  completedText: {
    fontSize: 16,
    color: colors.signal.success,
  },
  centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  errorText: {
      color: colors.text.muted,
  },
});
