import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import i18n from '../i18n';
import { CommitmentWithRange } from '../lib/commitmentHelpers';

interface CommitmentCardProps {
  commitment: CommitmentWithRange;
  activeCount: number;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CommitmentCard({
  commitment,
  activeCount,
  onPress,
}: CommitmentCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
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

  const countdown = getCountdown(commitment.deadline);
  const isUrgent = countdown.days <= 3 && !countdown.expired && commitment.status === 'pending';
  const showPageRange = commitment.startPage > 0 && commitment.endPage > 0;
  const showPartBadge = commitment.commitmentIndex > 1;
  const showActiveCountBadge = activeCount > 1;

  return (
    <AnimatedPressable
      style={[styles.card, isUrgent && styles.urgentCard, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {commitment.book.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            commitment.status === 'completed' && styles.completedBadge,
            commitment.status === 'defaulted' && styles.defaultedBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {commitment.status === 'pending'
              ? i18n.t('dashboard.in_progress')
              : commitment.status === 'completed'
              ? i18n.t('dashboard.completed')
              : i18n.t('dashboard.failed')}
          </Text>
        </View>
      </View>

      {showPageRange && (
        <Text style={styles.pageRange}>
          {i18n.t('dashboard.page_range', {
            start: commitment.startPage.toLocaleString(),
            end: commitment.endPage.toLocaleString(),
            defaultValue: `Target: pp. ${commitment.startPage} - ${commitment.endPage}`,
          })}
        </Text>
      )}

      {(showPartBadge || showActiveCountBadge) && (
        <View style={styles.badgeRow}>
          {showPartBadge && (
            <View style={styles.partBadge}>
              <Text style={styles.partBadgeText}>
                {i18n.t('dashboard.continuation_part', {
                  part: commitment.commitmentIndex,
                  defaultValue: `Part ${commitment.commitmentIndex}`,
                })}
              </Text>
            </View>
          )}
          {showActiveCountBadge && (
            <View style={styles.activeCountBadge}>
              <Text style={styles.activeCountText}>
                {i18n.t('dashboard.active_goals', {
                  count: activeCount,
                  defaultValue: `${activeCount} goals`,
                })}
              </Text>
            </View>
          )}
        </View>
      )}

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
              : `${i18n.t('dashboard.remaining')} ${countdown.days}${i18n.t(
                  'dashboard.days'
                )} ${countdown.hours}${i18n.t('dashboard.hours')}`}
          </Text>
        </View>
      )}

      <Text style={styles.pledgeAmount}>
        {i18n.t('dashboard.penalty')}: {commitment.currency === 'JPY' ? '\u00a5' : commitment.currency}
        {commitment.pledge_amount.toLocaleString()}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
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
  pageRange: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  partBadge: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  partBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7b1fa2',
  },
  activeCountBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e65100',
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
});
