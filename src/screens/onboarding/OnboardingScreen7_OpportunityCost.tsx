/**
 * OnboardingScreen7_OpportunityCost
 * Phase 2.2.2 - The Burn (Refactored with Count-Up Animation)
 *
 * Visualizes opportunity cost with a structured "Loss Impact Card".
 * Sequential reveal → Count-up animation → Burn effect
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeIn,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import PrimaryButton from '../../components/onboarding/PrimaryButton';
import CountUpText from '../../components/onboarding/CountUpText';
import BurningText from '../../components/onboarding/BurningText';
import AshParticles from '../../components/onboarding/AshParticles';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { ACT_THEMES } from '../../config/animation';
import i18n from '../../i18n';

import { useOnboardingAtmosphere } from '../../hooks/useOnboardingAtmosphere';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW';

// Format currency symbol
const getCurrencySymbol = (currency: Currency): string => {
  const symbols: Record<Currency, string> = {
    JPY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    KRW: '₩',
  };
  return symbols[currency];
};

type BurnPhase = 'intro' | 'reveal' | 'counting' | 'burning' | 'complete';

// Default values for data integrity
const DEFAULT_PLEDGE_AMOUNT = 3000;
const DEFAULT_CURRENCY: Currency = 'JPY';
const DEFAULT_TSUNDOKU_COUNT = 5;
const HOURS_PER_UNREAD_BOOK = 2;

// Animation timing constants
const ROW_REVEAL_DELAY = 200; // ms between row reveals
const COUNT_UP_DURATION = 1000; // ms for count-up animation
const COUNT_UP_DELAY_BASE = 600; // ms before count-up starts (after reveal)

export default function OnboardingScreen7({ navigation, route }: any) {
  // Get data from route params with fallback defaults for data integrity
  const params = route.params || {};
  const pledgeAmount = typeof params.pledgeAmount === 'number' && params.pledgeAmount > 0
    ? params.pledgeAmount
    : DEFAULT_PLEDGE_AMOUNT;
  const currency = (params.currency as Currency) || DEFAULT_CURRENCY;
  const tsundokuCount = typeof params.tsundokuCount === 'number' && params.tsundokuCount > 0
    ? params.tsundokuCount
    : DEFAULT_TSUNDOKU_COUNT;

  const [burnPhase, setBurnPhase] = useState<BurnPhase>('intro');
  const [countUpComplete, setCountUpComplete] = useState([false, false, false]);
  const { showToast } = useOnboardingAtmosphere();
  const burnProgress = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const labelOpacity = useSharedValue(1);

  // Calculate opportunity costs
  const opportunityCosts = useMemo(
    () => ({
      moneyAtRisk: pledgeAmount,
      hoursWasted: Math.round(tsundokuCount * HOURS_PER_UNREAD_BOOK),
      booksUnfinished: tsundokuCount,
    }),
    [pledgeAmount, tsundokuCount]
  );

  // Haptic feedback for count-up completion
  const triggerCountUpHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Handle individual count-up completion
  const handleCountUpComplete = useCallback((index: number) => {
    triggerCountUpHaptic();
    setCountUpComplete(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  }, [triggerCountUpHaptic]);

  // Check if all count-ups are complete to start burning
  useEffect(() => {
    if (countUpComplete.every(Boolean) && burnPhase === 'counting') {
      // Short pause after all counts complete, then burn
      const burnTimer = setTimeout(() => {
        setBurnPhase('burning');
        labelOpacity.value = withDelay(100, withTiming(0.3, { duration: 800 }));
      }, 500);
      return () => clearTimeout(burnTimer);
    }
  }, [countUpComplete, burnPhase]);

  // Auto-progress through phases
  useEffect(() => {
    // Show "Point of no return" toast
    showToast({
      message: i18n.t('onboarding.screen7_no_turning_back'),
      type: 'warning',
    });

    // Phase 1: Intro → Reveal
    const introTimer = setTimeout(() => {
      setBurnPhase('reveal');
    }, 1200);

    // Phase 2: Reveal → Counting (start count-up after rows are revealed)
    const countTimer = setTimeout(() => {
      setBurnPhase('counting');
    }, 1200 + 800); // intro + reveal animation time

    return () => {
      clearTimeout(introTimer);
      clearTimeout(countTimer);
    };
  }, []);

  // Handle burn completion
  const handleBurnComplete = useCallback(() => {
    cardOpacity.value = withTiming(0, { duration: 150 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTimeout(() => {
      setBurnPhase('complete');
    }, 150);
  }, []);

  // Handle continue
  const handleContinue = () => {
    navigation.navigate('Onboarding8', {
      ...route.params,
    });
  };

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const currencySymbol = getCurrencySymbol(currency);
  const showCard = burnPhase === 'reveal' || burnPhase === 'counting' || burnPhase === 'burning';
  const isCountingOrBurning = burnPhase === 'counting' || burnPhase === 'burning';

  return (
    <OnboardingLayout
      currentStep={7}
      totalSteps={14}
      title={i18n.t('onboarding.screen7_title')}
      subtitle=""
      showBackButton={false}
      footer={
        <PrimaryButton
          label={i18n.t('onboarding.next')}
          onPress={handleContinue}
          disabled={burnPhase !== 'complete'}
        />
      }
    >
      <View style={styles.container}>
        {/* Intro Text */}
        {burnPhase === 'intro' && (
          <Animated.View
            entering={FadeIn.duration(600)}
            exiting={FadeOut.duration(300)}
            style={styles.introContainer}
          >
            <Text style={styles.introText}>
              {i18n.t('onboarding.screen7_intro')}
            </Text>
          </Animated.View>
        )}

        {/* Loss Impact Card */}
        {showCard && (
          <Animated.View entering={FadeInUp.duration(400)}>
            <Animated.View style={[styles.lossCard, cardAnimatedStyle]}>
            {/* Card Header */}
            <Animated.View
              entering={FadeInUp.duration(300)}
              style={styles.cardHeader}
            >
              <Ionicons name="warning" size={20} color={ACT_THEMES.act2.accent} />
              <Text style={styles.cardHeaderText}>
                {i18n.t('onboarding.screen7_intro')}
              </Text>
            </Animated.View>

            {/* Row 1: Money at Risk - First to appear */}
            <Animated.View
              entering={FadeInUp.delay(0).duration(400)}
              style={styles.lossRow}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="cash-outline" size={28} color={ACT_THEMES.act2.orbColors[1]} />
              </View>
              <View style={styles.rowContent}>
                <Animated.Text style={[styles.rowLabel, labelAnimatedStyle]}>
                  {i18n.t('onboarding.screen7_money_at_risk')}
                </Animated.Text>
                <View style={styles.valueContainer}>
                  {burnPhase === 'burning' ? (
                    <BurningText
                      text={`${currencySymbol}${opportunityCosts.moneyAtRisk.toLocaleString()}`}
                      fontSize={40}
                      triggerBurn={true}
                      delay={0}
                      duration={900}
                    />
                  ) : (
                    <CountUpText
                      value={opportunityCosts.moneyAtRisk}
                      prefix={currencySymbol}
                      duration={COUNT_UP_DURATION}
                      delay={COUNT_UP_DELAY_BASE}
                      fontSize={40}
                      active={isCountingOrBurning}
                      onComplete={() => handleCountUpComplete(0)}
                    />
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Divider */}
            <Animated.View
              entering={FadeIn.delay(ROW_REVEAL_DELAY).duration(300)}
              style={styles.divider}
            />

            {/* Row 2: Time Wasted - 200ms delay */}
            <Animated.View
              entering={FadeInUp.delay(ROW_REVEAL_DELAY).duration(400)}
              style={styles.lossRow}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={28} color={ACT_THEMES.act2.orbColors[1]} />
              </View>
              <View style={styles.rowContent}>
                <Animated.Text style={[styles.rowLabel, labelAnimatedStyle]}>
                  {i18n.t('onboarding.screen7_hours_wasted')}
                </Animated.Text>
                <View style={styles.valueContainer}>
                  {burnPhase === 'burning' ? (
                    <BurningText
                      text={`${opportunityCosts.hoursWasted}h`}
                      fontSize={36}
                      triggerBurn={true}
                      delay={200}
                      duration={900}
                    />
                  ) : (
                    <CountUpText
                      value={opportunityCosts.hoursWasted}
                      suffix="h"
                      duration={COUNT_UP_DURATION}
                      delay={COUNT_UP_DELAY_BASE + 200}
                      fontSize={36}
                      active={isCountingOrBurning}
                      onComplete={() => handleCountUpComplete(1)}
                    />
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Divider */}
            <Animated.View
              entering={FadeIn.delay(ROW_REVEAL_DELAY * 2).duration(300)}
              style={styles.divider}
            />

            {/* Row 3: Books Unfinished - 400ms delay */}
            <Animated.View
              entering={FadeInUp.delay(ROW_REVEAL_DELAY * 2).duration(400)}
              style={styles.lossRow}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="book-outline" size={28} color={ACT_THEMES.act2.orbColors[1]} />
              </View>
              <View style={styles.rowContent}>
                <Animated.Text style={[styles.rowLabel, labelAnimatedStyle]}>
                  {i18n.t('onboarding.screen7_books_unfinished')}
                </Animated.Text>
                <View style={styles.valueContainer}>
                  {burnPhase === 'burning' ? (
                    <BurningText
                      text={`${opportunityCosts.booksUnfinished}`}
                      fontSize={36}
                      triggerBurn={true}
                      delay={400}
                      duration={900}
                      onBurnComplete={handleBurnComplete}
                    />
                  ) : (
                    <CountUpText
                      value={opportunityCosts.booksUnfinished}
                      duration={COUNT_UP_DURATION}
                      delay={COUNT_UP_DELAY_BASE + 400}
                      fontSize={36}
                      active={isCountingOrBurning}
                      onComplete={() => handleCountUpComplete(2)}
                    />
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Ash Particles */}
            <AshParticles
              burnProgress={burnProgress}
              particleCount={25}
              width={SCREEN_WIDTH - 64}
              height={280}
              active={burnPhase === 'burning'}
            />
          </Animated.View>
        </Animated.View>
        )}

        {/* Post-burn Message */}
        {burnPhase === 'complete' && (
          <Animated.View
            entering={FadeInUp.delay(50).duration(400)}
            style={styles.completeContainer}
          >
            <Text 
              style={styles.goneText}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {i18n.t('onboarding.screen7_gone_forever')}
            </Text>
            <Text style={styles.hopeText}>
              {i18n.t('onboarding.screen7_but_not_yet')}
            </Text>
          </Animated.View>
        )}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  introContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  introText: {
    fontSize: typography.fontSize.headingSmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.headingSmall * 1.5,
  },

  // Loss Impact Card
  lossCard: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: ACT_THEMES.act2.accent,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    // Subtle glow effect
    shadowColor: ACT_THEMES.act2.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 100, 100, 0.2)',
  },
  cardHeaderText: {
    fontSize: typography.fontSize.caption,
    color: ACT_THEMES.act2.orbColors[1],
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },

  // Loss Rows
  lossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.fontSize.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  valueContainer: {
    minHeight: 48,
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: spacing.sm,
  },

  // Complete State
  completeContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  goneText: {
    fontSize: typography.fontSize.headingLarge,
    fontWeight: '800',
    color: colors.status.error,
    textAlign: 'center',
  },
  hopeText: {
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: typography.fontSize.body * 1.6,
  },
});
