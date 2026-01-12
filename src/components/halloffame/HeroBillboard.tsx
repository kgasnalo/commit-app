import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { titanColors, titanTypography } from '../../theme/titan';
import { useLanguage } from '../../contexts/LanguageContext';
import { SecuredBadge } from './SecuredBadge';
import { AmbientGlow } from './AmbientGlow';
import { AutomotiveMetrics } from './AutomotiveMetrics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 480;
const COVER_WIDTH = 160;
const COVER_HEIGHT = 240;

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
        {/* Titan Background */}
        <View style={styles.backgroundContainer} pointerEvents="none">
          <LinearGradient
            colors={['#1A1008', '#100A06', '#080604']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Dynamic Ambient Glow from cover */}
          <AmbientGlow color={ambientColor} intensity="strong" />
        </View>

        {/* Hero Content */}
        <View style={styles.content}>
          {/* Book Cover with projection effect */}
          <View style={styles.coverContainer}>
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons
                  name="book"
                  size={48}
                  color={titanColors.text.muted}
                />
              </View>
            )}
          </View>

          {/* Book Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {book.author}
            </Text>

            {/* Badge and Date Row */}
            <View style={styles.metaRow}>
              <SecuredBadge size="md" variant="engraved" />
              <Text style={styles.date}>{completionDate}</Text>
            </View>
          </View>

          {/* Automotive Metrics */}
          <View style={styles.metricsContainer}>
            <AutomotiveMetrics
              daysToComplete={metrics.daysToComplete}
              pagesPerDay={metrics.pagesPerDay}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: HERO_HEIGHT,
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
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  // Cover styling with projection effect
  coverContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 8,
  },
  coverPlaceholder: {
    backgroundColor: titanColors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Info styling
  infoContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '200',
    color: titanColors.text.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 32,
  },
  author: {
    fontSize: 14,
    fontWeight: '400',
    color: titanColors.text.secondary,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  date: {
    fontSize: 12,
    color: titanColors.text.muted,
    letterSpacing: 0.3,
  },
  // Metrics container
  metricsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
});

export default HeroBillboard;
