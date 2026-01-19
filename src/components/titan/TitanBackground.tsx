/**
 * TitanBackground - Reusable Titan Design System Background
 *
 * A warm dark gradient background with ambient lighting effect used
 * across screens following the Titan Design System (Phase 4.9).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Titan Design System colors
const TITAN_COLORS = {
  /** Base gradient colors (warm dark theme) */
  BASE_GRADIENT: ['#1A1008', '#100A06', '#080604'] as const,
  /** Base gradient color stops */
  BASE_LOCATIONS: [0, 0.5, 1] as const,
  /** Default ambient light color (warm orange glow) */
  DEFAULT_AMBIENT: 'rgba(255, 160, 120, 0.15)',
  /** Ambient light fade color */
  AMBIENT_FADE: 'rgba(255, 160, 120, 0.06)',
} as const;

interface TitanBackgroundProps {
  /**
   * Custom ambient light color. Defaults to warm orange glow.
   * Use rgba format for proper transparency.
   */
  ambientColor?: string;
  /**
   * Whether to show the ambient lighting effect.
   * Defaults to true.
   */
  showAmbient?: boolean;
  /**
   * Custom style for the container.
   */
  style?: object;
}

/**
 * TitanBackground component renders a warm dark gradient with ambient lighting.
 *
 * This component uses absolute fill and pointerEvents="none" to act as a
 * background layer that doesn't interfere with touch events.
 */
export function TitanBackground({
  ambientColor = TITAN_COLORS.DEFAULT_AMBIENT,
  showAmbient = true,
  style,
}: TitanBackgroundProps) {
  // Parse the ambient color to create the fade version
  const ambientFade = ambientColor.replace(/[\d.]+\)$/, '0.06)');

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* Base gradient - warm dark theme */}
      <LinearGradient
        colors={[...TITAN_COLORS.BASE_GRADIENT]}
        locations={[...TITAN_COLORS.BASE_LOCATIONS]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient lighting from top-left */}
      {showAmbient && (
        <LinearGradient
          colors={[ambientColor, ambientFade, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});

export default TitanBackground;
