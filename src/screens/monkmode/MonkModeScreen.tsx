/**
 * MonkModeScreen - Entry Point
 * Phase 4.3 - Monk Mode Timer Setup
 *
 * Main screen for setting up a focus reading session.
 * Similar UX to meditation apps (Calm, Headspace).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsService } from '../../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../../config/haptics';
import { colors } from '../../theme/colors';
import i18n from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { supabase } from '../../lib/supabase';
import { MonkModeService, SessionSummary } from '../../lib/MonkModeService';
import DurationSlider from '../../components/monkmode/DurationSlider';
import BookSelector, { BookOption } from '../../components/monkmode/BookSelector';
import * as AnalyticsService from '../../lib/AnalyticsService';
import { captureError } from '../../utils/errorLogger';

interface MonkModeScreenProps {
  navigation: any;
}

export default function MonkModeScreen({ navigation }: MonkModeScreenProps) {
  const [duration, setDuration] = useState(30); // Default 30 minutes
  const [selectedBook, setSelectedBook] = useState<BookOption | null>(null);
  const [bookOptions, setBookOptions] = useState<BookOption[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [totalReadingTime, setTotalReadingTime] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch last used duration
      const lastDuration = await MonkModeService.getLastDuration();
      if (lastDuration) {
        setDuration(lastDuration);
      }

      // Fetch active commitments for book selection
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: commitments } = await supabase
          .from('commitments')
          .select(`
            id,
            book:books(id, title, author, cover_url)
          `)
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (commitments) {
          const uniqueBooks = new Map<string, BookOption>();
          commitments.forEach((c: any) => {
            const book = Array.isArray(c.book) ? c.book[0] : c.book;
            if (book && !uniqueBooks.has(book.id)) {
              uniqueBooks.set(book.id, {
                id: book.id,
                title: book.title,
                author: book.author,
                coverUrl: book.cover_url,
              });
            }
          });
          setBookOptions(Array.from(uniqueBooks.values()));
        }
      }

      // Fetch recent sessions
      const sessions = await MonkModeService.getRecentSessions(3);
      setRecentSessions(sessions);

      // Fetch total reading time
      const total = await MonkModeService.getTotalReadingTime();
      setTotalReadingTime(total);
    } catch (error) {
      captureError(error, { location: 'MonkModeScreen.fetchData' });
      console.error('[MonkModeScreen] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Button press scale for Piano Black luxury feel
  const buttonPressScale = useSharedValue(1);

  const startButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPressScale.value }],
  }));

  const handleStartButtonPressIn = () => {
    buttonPressScale.value = withSpring(
      HAPTIC_BUTTON_SCALES.heavy.pressed,
      HAPTIC_BUTTON_SCALES.heavy.spring
    );
  };

  const handleStartButtonPressOut = () => {
    buttonPressScale.value = withSpring(1, HAPTIC_BUTTON_SCALES.heavy.spring);
  };

  const handleStartSession = () => {
    try {
      HapticsService.feedbackHeavy();
      // Phase 8.3: Track session start
      AnalyticsService.monkModeSessionStarted({
        duration_minutes: duration,
        has_book_selected: selectedBook !== null,
      });
      navigation.navigate('MonkModeActive', {
        durationMinutes: duration,
        bookId: selectedBook?.id,
        bookTitle: selectedBook?.title,
      });
    } catch (error) {
      captureError(error, { location: 'MonkModeScreen.handleStartSession' });
      console.error('[MonkModeScreen] Navigation failed:', error);
    }
  };

  const formatTotalTime = (totalSeconds: number): string => {
    const { hours, minutes } = MonkModeService.formatDuration(totalSeconds);
    if (hours > 0) {
      return `${hours}${i18n.t('monkmode.hours_short')} ${minutes}${i18n.t('monkmode.minutes_short')}`;
    }
    return `${minutes}${i18n.t('monkmode.minutes_short')}`;
  };

  const formatSessionTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}${i18n.t('monkmode.minutes_short')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Finexa Style Background - Orange glow from top-left to black at bottom-right */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        {/* Layer 1: Base black */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#030303' }]} />

        {/* Layer 2: Main diagonal gradient - Orange glow from top-left */}
        <LinearGradient
          colors={[
            'rgba(255, 107, 53, 0.35)',   // Intense orange at top-left
            'rgba(255, 80, 30, 0.18)',    // Mid orange
            'rgba(255, 60, 20, 0.08)',    // Fading orange
            'transparent',                 // Black at bottom-right
          ]}
          locations={[0, 0.25, 0.5, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 3: Soft ambient glow for depth */}
        <LinearGradient
          colors={[
            'rgba(255, 140, 100, 0.12)',
            'rgba(255, 100, 60, 0.05)',
            'transparent',
          ]}
          locations={[0, 0.3, 0.6]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="leaf" size={32} color="#FF6B35" />
          </View>
          <Text style={styles.title}>{i18n.t('monkmode.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('monkmode.subtitle')}</Text>
        </View>

        {/* Total Reading Time Stats */}
        {totalReadingTime > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>
              {i18n.t('monkmode.total_reading_time')}
            </Text>
            <Text style={styles.statsValue}>{formatTotalTime(totalReadingTime)}</Text>
          </View>
        )}

        {/* Duration Selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>
            {i18n.t('monkmode.select_duration')}
          </Text>
          <DurationSlider value={duration} onValueChange={setDuration} />
        </View>

        {/* Book Selector */}
        {bookOptions.length > 0 && (
          <View style={styles.sectionContainer}>
            <BookSelector
              options={bookOptions}
              selectedBook={selectedBook}
              onSelect={setSelectedBook}
            />
          </View>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>
              {i18n.t('monkmode.recent_sessions')}
            </Text>
            <View style={styles.recentSessionsContainer}>
              {recentSessions.map((session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={styles.sessionLeft}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.sessionTime}>
                      {formatSessionTime(session.durationSeconds)}
                    </Text>
                  </View>
                  {session.bookTitle && (
                    <Text style={styles.sessionBook} numberOfLines={1}>
                      {session.bookTitle}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start Button - Fixed at bottom */}
      <View style={styles.buttonContainer}>
        <Animated.View style={startButtonAnimatedStyle}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartSession}
            onPressIn={handleStartButtonPressIn}
            onPressOut={handleStartButtonPressOut}
            activeOpacity={0.9}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.startButtonText}>
              {i18n.t('monkmode.start_session')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject, // 全画面カバー
    zIndex: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 53, 0.25)',
    // Orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FAFAFA',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  // Stats card - Tesla style (溶け込む)
  statsCard: {
    backgroundColor: 'rgba(26, 23, 20, 0.5)', // より透明に
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)', // より控えめ
    overflow: 'hidden',
    // ソフトなシャドウ
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '300', // 細めで高級感
    color: '#FAFAFA',
    letterSpacing: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  // Sessions container - Tesla style
  recentSessionsContainer: {
    backgroundColor: 'rgba(26, 23, 20, 0.4)', // より透明に
    borderRadius: 16,
    padding: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  sessionBook: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  // Bottom button container with gradient fade
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 24,
    backgroundColor: 'transparent',
    zIndex: 100, // Ensure button is clickable above ScrollView
    elevation: 10,
  },
  // Piano Black button with orange glow
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Strong orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
});
