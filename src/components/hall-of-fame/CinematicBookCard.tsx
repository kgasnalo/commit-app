import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { titanColors, titanShadows } from '../../theme/titan';
import { SecuredBadge } from './SecuredBadge';
import { ensureHttps } from '../../utils/googleBooks';

const CARD_WIDTH = 140;
const CARD_HEIGHT = 210;

interface CinematicBookCardProps {
  coverUrl: string | null;
  onPress: () => void;
  showBadge?: boolean;
  animationDelay?: number;
  style?: ViewStyle;
}

/**
 * CinematicBookCard - Thick Glass Block design
 * Premium book card without 1px borders, using shadows for depth
 */
export function CinematicBookCard({
  coverUrl,
  onPress,
  showBadge = true,
  animationDelay = 0,
  style,
}: CinematicBookCardProps) {
  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(400)}
      style={style}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <View style={styles.card}>
          {/* Book Cover */}
          {coverUrl ? (
            <Image
              source={{ uri: ensureHttps(coverUrl) || '' }}
              style={styles.cover}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.cover, styles.placeholder]}>
              <Ionicons
                name="book"
                size={32}
                color={titanColors.text.muted}
              />
            </View>
          )}

          {/* Gradient overlay for badge visibility */}
          <View style={styles.gradientOverlay} />

          {/* SECURED Badge - positioned at bottom left with metallic effect */}
          {showBadge && (
            <View style={styles.badgeContainer}>
              <SecuredBadge size="sm" variant="metallic" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 6,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 23, 20, 0.95)',
    // Thick Glass Block - NO borderWidth, use shadows for depth
    ...titanShadows.glass,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: 'rgba(26, 23, 20, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    // Inner glow effect - subtle ambient light
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    // Top/left highlight for glass depth
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    // Inner shadow simulation via shadow
    shadowColor: 'rgba(255, 107, 53, 0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    // Gradient simulation with linear opacity
    opacity: 0.8,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
  },
});

export default CinematicBookCard;
