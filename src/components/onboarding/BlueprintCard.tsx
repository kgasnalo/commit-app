/**
 * BlueprintCard Component
 * Phase 2.3.1 - The Blueprint (Screen 12)
 *
 * Animated commitment summary card that draws like a technical blueprint.
 * Each row reveals sequentially with typewriter text effect.
 */

import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HapticsService } from '../../lib/HapticsService';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { ACT_THEMES, TIMING_CONFIGS } from '../../config/animation';
import i18n from '../../i18n';

// Animation timing constants
const CARD_FADE_DURATION = 300;
const ROW_REVEAL_DURATION = 1200;
const DIVIDER_DURATION = 400;

// Staggered delays (ms from start)
const DELAYS = {
  cardFade: 0,
  row1Start: 300,
  divider1: 1500,
  row2Start: 1600,
  divider2: 2600,
  row3Start: 2700,
  complete: 3900,
};

interface BlueprintCardProps {
  bookTitle: string;
  deadline: string;
  pledgeAmount: number;
  currency: string;
  onAnimationComplete?: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KRW: '₩',
};

// Individual row component with typewriter animation
interface BlueprintRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  note?: string;
  delay: number;
  duration: number;
  onRevealStart?: () => void;
  onRevealComplete?: () => void;
}

function BlueprintRow({
  icon,
  label,
  value,
  note,
  delay,
  duration,
  onRevealStart,
  onRevealComplete,
}: BlueprintRowProps) {
  const revealProgress = useSharedValue(0);
  const iconOpacity = useSharedValue(0);

  // Derived values for text reveal (character count)
  const labelCharCount = useDerivedValue(() => {
    return Math.floor(revealProgress.value * label.length);
  });

  const valueCharCount = useDerivedValue(() => {
    // Value starts revealing after label is 50% done
    const valueProgress = Math.max(0, (revealProgress.value - 0.5) * 2);
    return Math.floor(valueProgress * value.length);
  });

  const noteCharCount = useDerivedValue(() => {
    if (!note) return 0;
    // Note starts revealing after value is done
    const noteProgress = Math.max(0, (revealProgress.value - 0.8) * 5);
    return Math.floor(noteProgress * note.length);
  });

  useEffect(() => {
    // Icon fades in first
    iconOpacity.value = withDelay(
      delay,
      withTiming(1, { duration: 200 }, (finished) => {
        if (finished && onRevealStart) {
          runOnJS(onRevealStart)();
        }
      })
    );

    // Text reveals after icon
    revealProgress.value = withDelay(
      delay + 200,
      withTiming(1, { duration, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onRevealComplete) {
          runOnJS(onRevealComplete)();
        }
      })
    );
  }, [delay, duration]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: 0.8 + iconOpacity.value * 0.2 }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelCharCount.value > 0 ? 1 : 0,
  }));

  const valueStyle = useAnimatedStyle(() => ({
    opacity: valueCharCount.value > 0 ? 1 : 0,
  }));

  const noteStyle = useAnimatedStyle(() => ({
    opacity: noteCharCount.value > 0 ? 1 : 0,
  }));

  return (
    <View style={styles.row}>
      <Animated.View style={iconStyle}>
        <Ionicons name={icon} size={24} color={ACT_THEMES.act3.accent} />
      </Animated.View>
      <View style={styles.rowContent}>
        <Animated.Text style={[styles.label, labelStyle]}>
          {label}
        </Animated.Text>
        <Animated.Text style={[styles.value, valueStyle]} numberOfLines={2}>
          {value}
        </Animated.Text>
        {note && (
          <Animated.Text style={[styles.note, noteStyle]}>
            {note}
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

// Animated divider line
interface AnimatedDividerProps {
  delay: number;
}

function AnimatedDivider({ delay }: AnimatedDividerProps) {
  const widthProgress = useSharedValue(0);

  useEffect(() => {
    widthProgress.value = withDelay(
      delay,
      withTiming(1, { duration: DIVIDER_DURATION, easing: Easing.out(Easing.quad) })
    );
  }, [delay]);

  const dividerStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value * 100}%`,
  }));

  return (
    <View style={styles.dividerContainer}>
      <Animated.View style={[styles.divider, dividerStyle]} />
    </View>
  );
}

export default function BlueprintCard({
  bookTitle,
  deadline,
  pledgeAmount,
  currency,
  onAnimationComplete,
}: BlueprintCardProps) {
  // Haptic feedback functions
  const triggerLightHaptic = useCallback(() => {
    HapticsService.feedbackLight();
  }, []);

  const triggerMediumHaptic = useCallback(() => {
    HapticsService.feedbackMedium();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.locale, { month: 'numeric', day: 'numeric' });
  };

  const formatCurrency = (amount: number | null, curr: string): string => {
    if (amount === null) return '---';
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    if (curr === 'JPY' || curr === 'KRW') {
      return `${symbol}${amount.toLocaleString()}`;
    }
    return `${symbol}${amount}`;
  };

  const formatAmount = (): string => {
    return formatCurrency(pledgeAmount, currency);
  };

  // Trigger completion callback after all animations
  useEffect(() => {
    if (onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, DELAYS.complete);
      return () => clearTimeout(timer);
    }
  }, [onAnimationComplete]);

  return (
    <Animated.View
      entering={FadeIn.duration(CARD_FADE_DURATION).delay(DELAYS.cardFade)}
      style={styles.card}
    >
      {/* Row 1: Book */}
      <BlueprintRow
        icon="book"
        label={i18n.t('blueprint.book_label')}
        value={bookTitle || i18n.t('blueprint.not_selected')}
        delay={DELAYS.row1Start}
        duration={ROW_REVEAL_DURATION}
        onRevealStart={triggerLightHaptic}
        onRevealComplete={triggerMediumHaptic}
      />

      <AnimatedDivider delay={DELAYS.divider1} />

      {/* Row 2: Deadline */}
      <BlueprintRow
        icon="time"
        label={i18n.t('blueprint.deadline_label')}
        value={formatDate(deadline)}
        delay={DELAYS.row2Start}
        duration={ROW_REVEAL_DURATION * 0.8}
        onRevealStart={triggerLightHaptic}
        onRevealComplete={triggerMediumHaptic}
      />

      <AnimatedDivider delay={DELAYS.divider2} />

      {/* Row 3: Pledge */}
      <BlueprintRow
        icon="heart"
        label={i18n.t('blueprint.pledge_label')}
        value={formatAmount()}
        note={i18n.t('blueprint.pledge_note')}
        delay={DELAYS.row3Start}
        duration={ROW_REVEAL_DURATION}
        onRevealStart={triggerLightHaptic}
        onRevealComplete={triggerMediumHaptic}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: ACT_THEMES.act3.accent + '40',
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
    marginBottom: 4,
  },
  value: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: '600',
  },
  note: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    marginTop: 2,
  },
  dividerContainer: {
    height: 1,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: ACT_THEMES.act3.accent + '60',
  },
});
