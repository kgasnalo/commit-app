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
  slashLight?: boolean; // 斜めの光沢エフェクト
  topBorder?: 'none' | 'orange' | 'white'; // 上部ボーダー（参考デザイン）
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
  slashLight = true,
  topBorder = 'none', // 参考デザインの上部ボーダー
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

      {/* Top Border - 参考デザインの上部ハイライト */}
      {topBorder !== 'none' && (
        <View
          style={[
            styles.topBorder,
            {
              backgroundColor: topBorder === 'orange' ? '#FF6B35' : 'rgba(255, 255, 255, 0.2)',
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Top edge highlight line */}
      {!isSunken && topBorder === 'none' && (
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.1)',
            'rgba(255, 255, 255, 0.03)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.topEdge, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          pointerEvents="none"
        />
      )}

      {/* Slash Light - 斜めの光沢エフェクト (参考デザインの特徴) */}
      {slashLight && (
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.03)',
            'rgba(255, 255, 255, 0.08)',
            'rgba(255, 255, 255, 0.03)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
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
    backgroundColor: titanColors.background.card, // 暖色系 #1A1714
    overflow: 'hidden',
  },
  sunkenContainer: {
    backgroundColor: titanColors.background.tertiary,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
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
