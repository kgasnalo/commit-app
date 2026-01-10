import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { titanColors, titanShadows } from '../../theme/titan';

interface GlassTileProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'sunken' | 'glowing';
  glow?: 'none' | 'gold' | 'ruby' | 'ambient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: number;
  slashLight?: boolean;
  topBorder?: 'none' | 'orange' | 'white';
  innerGlow?: 'none' | 'orange' | 'strong'; // 内側からの発光
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
  topBorder = 'none',
  innerGlow = 'none',
  style,
}: GlassTileProps) {
  const isSunken = variant === 'sunken';
  const isGlowing = variant === 'glowing';

  const shadowStyle = (() => {
    switch (variant) {
      case 'elevated':
        return titanShadows.glass;
      case 'sunken':
        return titanShadows.sunkenGlass;
      case 'glowing':
        return {
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 12,
        };
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
    if (isGlowing) {
      // 発光グラス: 背景からオレンジが透過
      return [
        'rgba(255, 107, 53, 0.15)',   // オレンジグロー（上）
        'rgba(255, 107, 53, 0.08)',
        'rgba(26, 23, 20, 0.95)',      // 半透明ダーク
        'rgba(26, 23, 20, 0.98)',
      ];
    }
    if (isSunken) {
      return [
        'rgba(0, 0, 0, 0.4)',
        'rgba(0, 0, 0, 0.1)',
        titanColors.background.card,
        'rgba(255, 255, 255, 0.02)',
      ];
    }
    return [
      'rgba(255, 255, 255, 0.12)',
      'rgba(255, 255, 255, 0.04)',
      'transparent',
      'transparent',
    ];
  };

  // Inner glow gradient (発光効果)
  const getInnerGlowColors = (): string[] | null => {
    if (innerGlow === 'strong') {
      return [
        'rgba(255, 107, 53, 0.25)',
        'rgba(255, 107, 53, 0.12)',
        'transparent',
        'transparent',
      ];
    }
    if (innerGlow === 'orange') {
      return [
        'rgba(255, 107, 53, 0.12)',
        'rgba(255, 107, 53, 0.05)',
        'transparent',
        'transparent',
      ];
    }
    return null;
  };

  const innerGlowColors = getInnerGlowColors();

  return (
    <View
      style={[
        styles.container,
        isSunken && styles.sunkenContainer,
        isGlowing && styles.glowingContainer,
        shadowStyle,
        glowStyle,
        { borderRadius },
        style,
      ]}
    >
      {/* Base gradient */}
      <LinearGradient
        colors={getGradientColors()}
        locations={isGlowing ? [0, 0.2, 0.6, 1] : isSunken ? [0, 0.15, 0.5, 1] : [0, 0.15, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        pointerEvents="none"
      />

      {/* Inner Glow - 内側からの発光 */}
      {innerGlowColors && (
        <LinearGradient
          colors={innerGlowColors}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          pointerEvents="none"
        />
      )}

      {/* Top Border */}
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
      {!isSunken && !isGlowing && topBorder === 'none' && (
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

      {/* Slash Light */}
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
    backgroundColor: titanColors.background.card,
    overflow: 'hidden',
  },
  sunkenContainer: {
    backgroundColor: titanColors.background.tertiary,
  },
  glowingContainer: {
    backgroundColor: 'rgba(26, 23, 20, 0.85)', // 半透明で発光が透過
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
  content: {},
});

export default GlassTile;
