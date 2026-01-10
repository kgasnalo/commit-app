import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { titanColors, titanShadows } from '../../theme/titan';

interface GlassTileProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'sunken';
  glow?: 'none' | 'gold' | 'ruby' | 'ambient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: number;
  style?: ViewStyle;
}

const paddingMap = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export function GlassTile({
  children,
  variant = 'default',
  glow = 'none',
  padding = 'md',
  borderRadius = 20,
  style,
}: GlassTileProps) {
  // Sunken style creates the "deep glass" effect from the reference
  const isSunken = variant === 'sunken';

  const shadowStyle = (() => {
    switch (variant) {
      case 'elevated':
        return titanShadows.glass;
      case 'sunken':
        return titanShadows.sunkenGlass;
      case 'subtle':
        return titanShadows.glassSubtle;
      default:
        return titanShadows.glassSubtle;
    }
  })();

  const glowStyle = (() => {
    if (glow === 'gold') return titanShadows.goldGlow;
    if (glow === 'ruby') return titanShadows.rubyGlow;
    if (glow === 'ambient') return titanShadows.ambientGlow;
    return {};
  })();

  // Gradient colors based on variant
  const getGradientColors = (): string[] => {
    if (isSunken) {
      // Sunken glass: darker at top-left, lighter reflection at bottom
      return [
        'rgba(0, 0, 0, 0.4)',      // Dark inner shadow
        'rgba(0, 0, 0, 0.1)',      // Mid transition
        titanColors.background.card,
        'rgba(255, 255, 255, 0.02)', // Subtle bottom reflection
      ];
    }
    // Default: top highlight
    return [
      'rgba(255, 255, 255, 0.12)',  // Strong top highlight
      'rgba(255, 255, 255, 0.04)',  // Fade
      'transparent',
      'transparent',
    ];
  };

  return (
    <View
      style={[
        styles.container,
        isSunken && styles.sunkenContainer,
        shadowStyle,
        glowStyle,
        { borderRadius },
        style,
      ]}
    >
      {/* Sunken inner shadow gradient */}
      <LinearGradient
        colors={getGradientColors()}
        locations={isSunken ? [0, 0.15, 0.5, 1] : [0, 0.15, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        pointerEvents="none"
      />

      {/* Top edge highlight line */}
      {!isSunken && (
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.topEdge, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          pointerEvents="none"
        />
      )}

      {/* Content */}
      <View style={[styles.content, { padding: paddingMap[padding] }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: titanColors.background.card,
    overflow: 'hidden',
  },
  sunkenContainer: {
    backgroundColor: '#0C0C0C', // Slightly lighter for sunken effect
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    // Content wrapper for padding
  },
});

export default GlassTile;
