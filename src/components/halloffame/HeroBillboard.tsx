import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { titanColors, titanTypography } from '../../theme/titan';
import { useLanguage } from '../../contexts/LanguageContext';
import { SecuredBadge } from './SecuredBadge';
import { AmbientGlow } from './AmbientGlow';
import { AutomotiveMetrics } from './AutomotiveMetrics';

const HERO_HEIGHT = 560; // Increased height for luxury spacing

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

interface Commitment {
  id: string;
  target_pages: number;
  created_at: string;
  updated_at: string | null;
  books: Book;
}

interface HeroBillboardProps {
  commitment: Commitment;
  coverUrl: string | null;
  ambientColor: string;
  onPress: () => void;
}

/**
 * HeroBillboard - Featured book hero section
 * Netflix/Apple Music style presentation with dynamic ambient lighting
 */
export function HeroBillboard({
  commitment,
  coverUrl,
  ambientColor,
  onPress,
}: HeroBillboardProps) {
  const { language } = useLanguage();
  const book = commitment.books;

  // Calculate automotive metrics
  const metrics = useMemo(() => {
    const startDate = new Date(commitment.created_at);
    const endDate = commitment.updated_at
      ? new Date(commitment.updated_at)
      : new Date();

    const daysToComplete = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const pagesPerDay = Math.round(commitment.target_pages / daysToComplete);

    return { daysToComplete, pagesPerDay };
  }, [commitment]);

  // Format completion date
  const completionDate = useMemo(() => {
    const date = new Date(commitment.updated_at || commitment.created_at);
    const locale = language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [commitment, language]);

  return (
    <Animated.View
      entering={FadeInDown.duration(600).springify()}
      style={styles.container}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.touchable}
      >
        {/* Titan Background with warm gradient */}
        <View style={styles.backgroundContainer} pointerEvents="none">
          <LinearGradient
            colors={['#1A1008', '#100A06', '#080604']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Dynamic Ambient Glow from cover - enhanced backlight */}
          <AmbientGlow color={ambientColor} intensity="cinematic" />
        </View>

        {/* Hero Content - Vertical flow with proper spacing */}
        <View style={styles.content}>
          {/* Billboard Title - Movie poster style */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.titleContainer}
          >
            <Text style={styles.title} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {book.author}
            </Text>
          </Animated.View>

          {/* Thick Glass Stats Panel */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(500)}
            style={styles.glassPanel}
          >
            {/* Top/Left highlight edge - simulates glass thickness */}
            <View style={styles.glassHighlightTop} />
            <View style={styles.glassHighlightLeft} />

            {/* Blurred backdrop for glass effect */}
            <View style={styles.glassPanelInner}>
              <AutomotiveMetrics
                daysToComplete={metrics.daysToComplete}
                pagesPerDay={metrics.pagesPerDay}
              />

              {/* Badge and Date Row integrated into glass panel */}
              <View style={styles.metaRow}>
                <SecuredBadge size="lg" variant="metallic" />
                <Text style={styles.date}>{completionDate}</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Backlight Glow Effect - positioned behind cover area */}
        <View style={styles.backlightContainer} pointerEvents="none">
          <View style={[styles.backlight, { backgroundColor: ambientColor || '#FF6B35' }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: HERO_HEIGHT,
  },
  touchable: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  // Billboard Title - Movie poster typography
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48, // Luxury vertical spacing
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28, // Larger for billboard impact
    fontWeight: '300',
    color: titanColors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5, // Tighter tracking for heavyweight feel
    lineHeight: 36,
    textShadowColor: 'rgba(255, 255, 255, 0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: '400',
    color: titanColors.text.secondary,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  // Thick Glass Panel - Physical glass block appearance
  glassPanel: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    overflow: 'hidden',
    // Remove all borders - only top/left highlights
    ...Platform.select({
      ios: {
        // iOS glass effect
      },
      android: {
        elevation: 4,
      },
    }),
  },
  glassHighlightTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassHighlightLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassPanelInner: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  // Meta row inside glass panel
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  date: {
    fontSize: 12,
    color: titanColors.text.muted,
    letterSpacing: 0.5,
  },
  // Backlight effect - Strong bokeh behind content
  backlightContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: -1,
  },
  backlight: {
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.4,
    // Heavy blur simulation via shadow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
    elevation: 0,
  },
});

export default HeroBillboard;
