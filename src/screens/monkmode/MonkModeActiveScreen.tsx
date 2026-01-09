/**
 * MonkModeActiveScreen - Timer Running
 * Phase 4.3 - Monk Mode Active Timer
 *
 * Full-screen immersive timer display with pause/cancel controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import i18n from '../../i18n';
import { useKeepAwake } from 'expo-keep-awake';
import { useMonkModeTimer } from '../../hooks/useMonkModeTimer';
import { MonkModeService } from '../../lib/MonkModeService';
import TimerRing from '../../components/monkmode/TimerRing';
import TimerDisplay from '../../components/monkmode/TimerDisplay';
import SessionCompleteModal from '../../components/monkmode/SessionCompleteModal';
import { SPRING_CONFIGS } from '../../config/animation';

export default function MonkModeActiveScreen({ route, navigation }: any) {
  useKeepAwake(); // Keep screen on while timer is active
  const { durationMinutes, bookId, bookTitle } = route.params;

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Animation values for entry
  const overlayOpacity = useSharedValue(1);
  const contentScale = useSharedValue(0.9);
  const contentOpacity = useSharedValue(0);

  // Timer hook
  const {
    remainingSeconds,
    status,
    progress,
    start,
    pause,
    resume,
    cancel,
  } = useMonkModeTimer({
    durationMinutes,
    bookId,
    bookTitle,
    onComplete: handleTimerComplete,
  });

  // Start timer on mount with entry animation
  useEffect(() => {
    // Entry animation
    setTimeout(() => {
      overlayOpacity.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
      contentOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      });
      contentScale.value = withSpring(1, SPRING_CONFIGS.smooth);
    }, 100);

    // Start timer after animation
    setTimeout(() => {
      start();
    }, 400);
  }, []);

  // Handle timer completion
  function handleTimerComplete() {
    setShowCompleteModal(true);
    saveSession();
  }

  // Save session to database
  const saveSession = async () => {
    if (sessionSaved) return;

    const result = await MonkModeService.saveSession({
      durationSeconds: durationMinutes * 60,
      bookId,
    });

    if (result.success) {
      setSessionSaved(true);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCompleteModal(false);
    navigation.goBack();
  };

  // Handle start another session
  const handleStartAnother = () => {
    setShowCompleteModal(false);
    navigation.replace('MonkModeActive', {
      durationMinutes,
      bookId,
      bookTitle,
    });
  };

  // Handle pause/resume toggle
  const handlePauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (status === 'running') {
      pause();
    } else if (status === 'paused') {
      resume();
    }
  };

  // Handle cancel with confirmation
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      i18n.t('monkmode.cancel_confirm_title'),
      i18n.t('monkmode.cancel_confirm_message'),
      [
        {
          text: i18n.t('common.cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('common.ok'),
          style: 'destructive',
          onPress: async () => {
            await cancel();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Animated styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Entry overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" />

      {/* Main content */}
      <Animated.View style={[styles.content, contentStyle]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Cancel button (top-left) */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Timer area */}
          <View style={styles.timerContainer}>
            {/* Book title */}
            {bookTitle && (
              <View style={styles.bookTitleContainer}>
                <Ionicons name="book-outline" size={16} color={colors.text.muted} />
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {bookTitle}
                </Text>
              </View>
            )}

            {/* Timer Ring + Display */}
            <View style={styles.timerRingContainer}>
              <TimerRing
                progress={progress}
                size={280}
                strokeWidth={6}
                backgroundColor={colors.background.tertiary}
                progressColor={colors.accent.primary}
              />
              <View style={styles.timerDisplayOverlay}>
                <TimerDisplay
                  remainingSeconds={remainingSeconds}
                  showHours={durationMinutes >= 60}
                />
                {/* Status indicator */}
                {status === 'paused' && (
                  <Text style={styles.pausedText}>
                    {i18n.t('monkmode.paused')}
                  </Text>
                )}
              </View>
            </View>

            {/* Title */}
            <Text style={styles.activeTitle}>
              {i18n.t('monkmode.active_title')}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePauseResume}
              activeOpacity={0.8}
            >
              <Ionicons
                name={status === 'running' ? 'pause' : 'play'}
                size={32}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {status === 'running'
                  ? i18n.t('monkmode.pause')
                  : i18n.t('monkmode.resume')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retireButton}
              onPress={handleCancel}
              hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              <Text style={styles.retireButtonText}>
                {i18n.t('monkmode.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Completion Modal */}
      <SessionCompleteModal
        visible={showCompleteModal}
        durationMinutes={durationMinutes}
        bookTitle={bookTitle}
        onClose={handleModalClose}
        onStartAnother={handleStartAnother}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  cancelButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bookTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
    gap: 8,
    maxWidth: '80%',
  },
  bookTitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  timerRingContainer: {
    position: 'relative',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplayOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    fontSize: 14,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 32,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  controlsContainer: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 12,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  retireButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retireButtonText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
