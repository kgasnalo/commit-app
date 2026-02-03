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
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSilentSwitch } from 'react-native-volume-manager';
import { HapticsService } from '../../lib/HapticsService';
import { SoundManager, MonkModeSoundKey } from '../../lib/audio';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import i18n from '../../i18n';
import { useKeepAwake } from 'expo-keep-awake';
import { useMonkModeTimer } from '../../hooks/useMonkModeTimer';
import { MonkModeService } from '../../lib/MonkModeService';
import TimerRing from '../../components/monkmode/TimerRing';
import TimerDisplay from '../../components/monkmode/TimerDisplay';
import SessionCompleteModal from '../../components/monkmode/SessionCompleteModal';
import { SPRING_CONFIGS } from '../../config/animation';
import * as AnalyticsService from '../../lib/AnalyticsService';

export default function MonkModeActiveScreen({ route, navigation }: any) {
  useKeepAwake(); // Keep screen on while timer is active
  const { durationMinutes, bookId, bookTitle, soundKey = 'bonfire' } = route.params;
  const monkSoundKey: MonkModeSoundKey = soundKey;

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Silent mode detection (iOS only)
  const silentSwitch = useSilentSwitch();
  const isSilentMode = silentSwitch?.isMuted ?? false;
  const showSilentBanner = Platform.OS === 'ios' && isSilentMode && soundKey !== 'none' && !isMuted;

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

  // Start timer on mount with entry animation + ambient sound
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

    // Start timer and ambient sound after animation
    setTimeout(() => {
      start();
      // Initialize and play selected ambient sound
      SoundManager.initialize().then(() => {
        if (__DEV__) console.log('[MonkMode] SoundManager initialized, starting sound:', monkSoundKey);
        SoundManager.setMuted(false);
        SoundManager.playMonkModeSound(monkSoundKey);
      }).catch((err) => {
        if (__DEV__) console.warn('[MonkMode] SoundManager init failed:', err);
      });
    }, 400);

    return () => {
      // Stop ambient sound on unmount
      SoundManager.stopAll();
    };
  }, []);

  // Handle timer completion
  function handleTimerComplete() {
    // Phase 8.3: Track session completion
    AnalyticsService.monkModeSessionCompleted({
      duration_minutes: durationMinutes,
      actual_duration_seconds: durationMinutes * 60,
      book_id: bookId || null,
    });
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
      soundKey: monkSoundKey,
    });
  };

  // Handle pause/resume toggle
  const handlePauseResume = () => {
    HapticsService.feedbackLight();
    if (status === 'running') {
      pause();
      SoundManager.stopMonkModeSound();
    } else if (status === 'paused') {
      resume();
      if (!isMuted) {
        SoundManager.playMonkModeSound(monkSoundKey);
      }
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    HapticsService.feedbackLight();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    SoundManager.setMuted(newMuted);
    if (newMuted) {
      SoundManager.stopMonkModeSound();
    } else if (status === 'running') {
      SoundManager.playMonkModeSound(monkSoundKey);
    }
  };

  // Handle cancel with confirmation
  const handleCancel = () => {
    HapticsService.feedbackMedium();

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
            // Phase 8.3: Track session cancellation
            const elapsedSeconds = (durationMinutes * 60) - remainingSeconds;
            AnalyticsService.monkModeSessionCancelled({
              duration_minutes: durationMinutes,
              seconds_elapsed: elapsedSeconds,
            });
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

      {/* Titan Background */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#0C0A08', '#080604']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Centered ambient glow for timer focus */}
        <LinearGradient
          colors={[
            'rgba(255, 160, 120, 0.08)',
            'rgba(255, 160, 120, 0.03)',
            'transparent',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

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

          {/* Mute button (top-right) */}
          <TouchableOpacity
            style={styles.muteButton}
            onPress={handleMuteToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-medium'}
              size={24}
              color={colors.text.secondary}
            />
          </TouchableOpacity>

          {/* Silent mode banner */}
          {showSilentBanner && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.silentBanner}
            >
              <Ionicons name="volume-mute" size={16} color="#FF6B35" />
              <Text style={styles.silentBannerText}>
                {i18n.t('monkmode.silent_mode_warning')}
              </Text>
            </Animated.View>
          )}

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
                backgroundColor="rgba(26, 23, 20, 0.8)"
                progressColor="#FF6B35"
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
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },
  content: {
    flex: 1,
    zIndex: 1,
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
  muteButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  silentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 23, 20, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 110,
    marginHorizontal: 40,
    gap: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  silentBannerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // Glassmorphism book title badge
  bookTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 36,
    gap: 10,
    maxWidth: '80%',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bookTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
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
    fontSize: 13,
    color: 'rgba(255, 160, 120, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
    fontWeight: '600',
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 36,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  controlsContainer: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  // Piano Black control button with orange glow
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 32,
    gap: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Strong orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
  retireButton: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retireButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    fontWeight: '500',
    letterSpacing: 1.5,
  },
});
