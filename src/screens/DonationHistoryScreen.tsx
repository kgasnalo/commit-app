import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import { useUnread } from '../contexts/UnreadContext';
import { colors } from '../theme';
import { TitanBackground } from '../components/titan/TitanBackground';
import { MicroLabel } from '../components/titan/MicroLabel';
import { captureError } from '../utils/errorLogger';

// Charge status type from database
type ChargeStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action' | 'refunded';

// Penalty charge with book info
interface PenaltyChargeWithBook {
  id: string;
  amount: number;
  currency: string;
  charge_status: ChargeStatus;
  failure_reason: string | null;
  created_at: string;
  book_title: string;
}

// Status badge configuration
const STATUS_CONFIG: Record<ChargeStatus, { icon: string; color: string; labelKey: string }> = {
  succeeded: { icon: 'checkmark-circle', color: '#4CAF50', labelKey: 'donation_history.status_succeeded' },
  failed: { icon: 'close-circle', color: '#FF3D00', labelKey: 'donation_history.status_failed' },
  refunded: { icon: 'return-down-back', color: '#FF6B35', labelKey: 'donation_history.status_refunded' },
  pending: { icon: 'time', color: '#888888', labelKey: 'donation_history.status_pending' },
  processing: { icon: 'time', color: '#888888', labelKey: 'donation_history.status_processing' },
  requires_action: { icon: 'alert-circle', color: '#FFA000', labelKey: 'donation_history.status_requires_action' },
};

// Format amount with currency
function formatAmount(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    JPY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    KRW: '₩',
  };
  const symbol = currencySymbols[currency] || currency;

  if (currency === 'JPY' || currency === 'KRW') {
    return `${symbol}${amount.toLocaleString()}`;
  }
  return `${symbol}${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// Format date based on language
function formatDate(dateString: string, language: string): string {
  const date = new Date(dateString);
  const locale = language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DonationHistoryScreen({ navigation }: any) {
  const { language } = useLanguage();
  const { markAsRead } = useUnread();
  const [charges, setCharges] = useState<PenaltyChargeWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mark donations as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      markAsRead('donations');
    }, [markAsRead])
  );

  const fetchDonationHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(i18n.t('errors.auth'));
        return;
      }

      // Fetch penalty charges with commitment and book info
      const { data, error: fetchError } = await supabase
        .from('penalty_charges')
        .select(`
          id,
          amount,
          currency,
          charge_status,
          failure_reason,
          created_at,
          commitments!inner (
            books!inner (
              title
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to flat structure
      const transformedData: PenaltyChargeWithBook[] = (data || []).map((charge: any) => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        charge_status: charge.charge_status,
        failure_reason: charge.failure_reason,
        created_at: charge.created_at,
        book_title: charge.commitments?.books?.title || i18n.t('common.untitled'),
      }));

      setCharges(transformedData);
    } catch (err) {
      captureError(err, { location: 'DonationHistoryScreen.fetchDonationHistory' });
      setError(i18n.t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDonationHistory();
    }, [fetchDonationHistory])
  );

  // Calculate total donations (only succeeded charges)
  const totalDonated = charges
    .filter(c => c.charge_status === 'succeeded')
    .reduce((sum, c) => {
      // Normalize to smallest unit (assume JPY for simplicity if mixed currencies)
      return sum + c.amount;
    }, 0);

  // Get primary currency from charges
  const primaryCurrency = charges.length > 0 ? charges[0].currency : 'JPY';

  const renderChargeItem = ({ item }: { item: PenaltyChargeWithBook }) => {
    const statusConfig = STATUS_CONFIG[item.charge_status];

    return (
      <View style={styles.chargeItem}>
        <View style={styles.chargeHeader}>
          <View style={styles.bookInfo}>
            <Ionicons name="book-outline" size={16} color={colors.text.muted} />
            <Text style={styles.bookTitle} numberOfLines={1}>
              {item.book_title}
            </Text>
          </View>
        </View>

        <View style={styles.chargeDetails}>
          <View style={styles.chargeLeft}>
            <Text style={styles.chargeDate}>
              {formatDate(item.created_at, language)}
            </Text>
            <Text style={styles.chargeAmount}>
              {formatAmount(item.amount, item.currency)}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Ionicons
              name={statusConfig.icon as any}
              size={16}
              color={statusConfig.color}
            />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {i18n.t(statusConfig.labelKey)}
            </Text>
          </View>
        </View>

        {item.charge_status === 'failed' && item.failure_reason && (
          <View style={styles.failureReason}>
            <Text style={styles.failureReasonText}>
              ({item.failure_reason})
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color={colors.text.muted} />
      <Text style={styles.emptyTitle}>
        {i18n.t('donation_history.empty_title')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {i18n.t('donation_history.empty_subtitle')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TitanBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.t('donation_history.title')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signal.active} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchDonationHistory}
            >
              <Text style={styles.retryButtonText}>
                {i18n.t('bookDetail.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={charges}
              renderItem={renderChargeItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                charges.length === 0 && styles.listContentEmpty,
              ]}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
            />

            {/* Total Section - only show if there are succeeded charges */}
            {charges.some(c => c.charge_status === 'succeeded') && (
              <View style={styles.totalSection}>
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <MicroLabel color={colors.text.muted}>
                    {i18n.t('donation_history.total_donated')}
                  </MicroLabel>
                  <Text style={styles.totalAmount}>
                    {formatAmount(totalDonated, primaryCurrency)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.signal.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  chargeItem: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  chargeHeader: {
    marginBottom: 12,
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  chargeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chargeLeft: {
    flex: 1,
  },
  chargeDate: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 4,
  },
  chargeAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  failureReason: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  failureReasonText: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  totalSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
