import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsService } from '../lib/HapticsService';
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
    HapticsService.feedbackMedium();
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

  // Build accessibility label
  const getAccessibilityLabel = () => {
    const currencySymbol = commitment.currency === 'JPY' ? '¥' : commitment.currency;
    const amount = `${currencySymbol}${commitment.pledge_amount.toLocaleString()}`;

    if (commitment.status === 'completed') {
      return i18n.t('accessibility.card.commitment_completed', {
        title: commitment.book.title,
      });
    }

    if (countdown.expired) {
      return i18n.t('accessibility.card.commitment_expired', {
        title: commitment.book.title,
      });
    }

    return i18n.t('accessibility.card.commitment', {
      title: commitment.book.title,
      amount,
      days: countdown.days,
      hours: countdown.hours,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={i18n.t('accessibility.hint.double_tap_to_activate')}
    >
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          isUrgent && styles.cardUrgent,
        ]}
      >
        {/* Glassmorphism base - 暖色系ダーク */}
        <LinearGradient
          colors={[
            'rgba(26, 23, 20, 0.9)',     // 暖かみのあるダーク
            'rgba(26, 23, 20, 0.95)',
            'rgba(20, 18, 16, 1)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glassOverlay]}
          pointerEvents="none"
        />

        {/* Soft Glow - 柔らかい環境光（左上から） */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.06)',
            'rgba(255, 255, 255, 0.02)',
            'transparent',
          ]}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.7 }}
          style={[StyleSheet.absoluteFill, styles.glassOverlay]}
          pointerEvents="none"
        />

        {/* Inner orange glow - 控えめなオレンジ発光 */}
        <LinearGradient
          colors={[
            'rgba(255, 107, 53, 0.06)',
            'rgba(255, 107, 53, 0.02)',
            'transparent',
          ]}
          locations={[0, 0.3, 0.6]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glassOverlay]}
          pointerEvents="none"
        />

        {/* Arrow indicator (参考デザインの特徴) */}
        <View style={styles.arrowIndicator}>
          <Ionicons name="arrow-forward" size={14} color="rgba(255, 255, 255, 0.3)" />
        </View>

        <View style={styles.cardContent}>
          {/* 本の表紙サムネイル */}
          <View style={styles.coverContainer}>
            {commitment.book.cover_url ? (
              <Image
                source={{ uri: commitment.book.cover_url.replace('http://', 'https://').replace(/&edge=curl/g, '') }}
                style={styles.coverImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book" size={20} color="rgba(255, 255, 255, 0.3)" />
              </View>
            )}
          </View>

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
    backgroundColor: '#1A1714', // 暖色系ダーク
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    // Subtle shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  cardUrgent: {
    // Red ambient glow for urgent cards
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowRadius: 16,
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
  coverContainer: {
    width: 44,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  sideInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pledgeValue: {
    fontSize: 18,
    fontWeight: '400',
    color: '#FAFAFA',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  countdown: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  urgentText: {
    color: '#FF6B6B',
  },
});