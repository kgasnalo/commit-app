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
import { TacticalText } from './titan/TacticalText';

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
        {/* Glass highlight gradient */}
        <LinearGradient
          colors={[
            titanColors.background.glassHighlight,
            'transparent',
            'transparent',
          ]}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glassOverlay]}
          pointerEvents="none"
        />
        <View style={styles.cardContent}>
          <View style={styles.mainInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.bookTitle} numberOfLines={1}>
                {commitment.book.title}
              </Text>
              {commitment.status === 'completed' && (
                <Ionicons name="checkmark-circle" size={16} color={colors.signal.success} />
              )}
            </View>

            <View style={styles.metaRow}>
              {showPageRange && (
                <TacticalText size={13} color={colors.text.secondary}>
                  P.{commitment.startPage}-{commitment.endPage}
                </TacticalText>
              )}
              {activeCount > 1 && (
                <MicroLabel style={styles.linkedBadge}>+{activeCount - 1} LINKED</MicroLabel>
              )}
            </View>
          </View>

          <View style={styles.sideInfo}>
            <View style={styles.pledgeContainer}>
              <TacticalText size={16} weight="bold" color={isUrgent ? colors.signal.danger : colors.text.primary}>
                {commitment.currency === 'JPY' ? '¥' : commitment.currency}
                {commitment.pledge_amount.toLocaleString()}
              </TacticalText>
            </View>

            {commitment.status === 'pending' && (
              <View style={styles.timerContainer}>
                <MicroLabel color={isUrgent ? colors.signal.danger : colors.text.muted}>
                  {countdown.expired ? 'EXPIRED' : `${countdown.days}D ${countdown.hours}H`}
                </MicroLabel>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: titanColors.background.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    // Glass shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardUrgent: {
    // Ruby glow for urgent cards
    shadowColor: titanColors.signal.danger,
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  glassOverlay: {
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainInfo: {
    flex: 1,
    marginRight: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  bookTitle: {
    fontFamily: typography.fontFamily.body,
    fontWeight: '500',
    fontSize: 16,
    color: colors.text.primary,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkedBadge: {
    fontSize: 10,
    color: colors.signal.info,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sideInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pledgeContainer: {
    marginBottom: 2,
  },
  timerContainer: {
    marginTop: 2,
  },
});