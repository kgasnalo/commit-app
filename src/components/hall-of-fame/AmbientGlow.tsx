import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { titanColors } from '../../theme/titan';

interface AmbientGlowProps {
  color?: string;
  intensity?: 'subtle' | 'medium' | 'strong' | 'cinematic';
  style?: ViewStyle;
}

/**
 * AmbientGlow - Dynamic color gradient overlay
 * Creates a warm ambient lighting effect from the top-left
 * Used to project extracted cover colors onto the background
 *
 * "cinematic" mode creates a dramatic backlight effect with blur(60px)+ equivalent
 */
export function AmbientGlow({
  color = titanColors.accent.primary,
  intensity = 'medium',
  style
}: AmbientGlowProps) {
  // Calculate opacity based on intensity
  // cinematic mode for dramatic backlight effect
  const opacityMap = {
    subtle: { high: 0.08, mid: 0.03, low: 0 },
    medium: { high: 0.15, mid: 0.06, low: 0 },
    strong: { high: 0.25, mid: 0.10, low: 0 },
    cinematic: { high: 0.35, mid: 0.18, low: 0.05 }, // Dramatic backlight
  };

  const opacities = opacityMap[intensity];

  // Convert color to rgba with specified opacity
  const toRgba = (hex: string, opacity: number): string => {
    // Handle rgba format
    if (hex.startsWith('rgba')) return hex;
    if (hex.startsWith('rgb')) {
      const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
      }
    }

    // Handle hex format
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Fallback
    return `rgba(255, 107, 53, ${opacity})`;
  };

  return (
    <LinearGradient
      colors={[
        toRgba(color, opacities.high),
        toRgba(color, opacities.mid),
        'transparent',
      ]}
      locations={[0, 0.4, 0.8]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.8, y: 0.7 }}
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
    />
  );
}

export default AmbientGlow;
