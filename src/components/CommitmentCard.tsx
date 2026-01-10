import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import i18n from '../i18n';
import { CommitmentWithRange } from '../lib/commitmentHelpers';
import { colors, typography, shadows } from '../theme';
import { titanColors, titanShadows } from '../theme/titan';
import { MicroLabel } from './titan/MicroLabel';

interface CommitmentCardProps {
  commitment: CommitmentWithRange;
  activeCount: number;
  onPress: () => void;
}

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
    scale.value = withSpring(0.98, { damping: 20, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
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
  // Red warning only if < 2 days
  const isUrgent = countdown.days <= 1 && !countdown.expired && commitment.status === 'pending';
  const showPageRange = commitment.startPage > 0 && commitment.endPage > 0;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          isUrgent && styles.cardUrgent,
        ]}
      >
        {/* Sunken glass gradient - darker at top-left */}
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.35)',
            'rgba(0, 0, 0, 0.1)',
            '#0C0C0C',
            'rgba(255, 255, 255, 0.02)',
          ]}
          locations={[0, 0.15, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glassOverlay]}
          pointerEvents="none"
        />

        {/* Slash Light - 斜めの光沢エフェクト */}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.02)',
            'rgba(255, 255, 255, 0.06)',
            'rgba(255, 255, 255, 0.02)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glassOverlay]}
          pointerEvents="none"
        />

        {/* Arrow indicator (参考デザインの特徴) */}
        <View style={styles.arrowIndicator}>
          <Ionicons name="arrow-forward" size={14} color="rgba(255, 255, 255, 0.3)" />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.mainInfo}>
            <Text style={styles.bookTitle} numberOfLines={1}>
              {commitment.book.title}
            </Text>

            <View style={styles.metaRow}>
              {showPageRange && (
                <Text style={styles.pageRange}>
                  P.{commitment.startPage}-{commitment.endPage}
                </Text>
              )}
              {activeCount > 1 && (
                <View style={styles.linkedBadge}>
                  <Text style={styles.linkedBadgeText}>+{activeCount - 1}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sideInfo}>
            <Text style={[styles.pledgeValue, isUrgent && styles.urgentText]}>
              {commitment.currency === 'JPY' ? '¥' : commitment.currency}
              {commitment.pledge_amount.toLocaleString()}
            </Text>

            {commitment.status === 'pending' && (
              <Text style={[styles.countdown, isUrgent && styles.urgentText]}>
                {countdown.expired ? 'EXPIRED' : `${countdown.days}D ${countdown.hours}H`}
              </Text>
            )}

            {commitment.status === 'completed' && (
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0C0C0C',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    // Subtle shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  cardUrgent: {
    // Red ambient glow for urgent cards
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  glassOverlay: {
    borderRadius: 20,
  },
  arrowIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainInfo: {
    flex: 1,
    marginRight: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FAFAFA',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageRange: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontVariant: ['tabular-nums'],
  },
  linkedBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  linkedBadgeText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600',
  },
  sideInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pledgeValue: {
    fontSize: 18,
    fontWeight: '300',
    color: '#FAFAFA',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  countdown: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  urgentText: {
    color: '#FF6B6B',
  },
});