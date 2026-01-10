import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { titanColors, titanShadows } from '../../theme/titan';

interface GlassTileProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
  glow?: 'none' | 'gold' | 'ruby';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: number;
  style?: ViewStyle;
}

const paddingMap = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
};

export function GlassTile({
  children,
  variant = 'default',
  glow = 'none',
  padding = 'md',
  borderRadius = 16,
  style,
}: GlassTileProps) {
  const shadowStyle = (() => {
    switch (variant) {
      case 'elevated':
        return titanShadows.glass;
      case 'subtle':
        return titanShadows.glassSubtle;
      default:
        return titanShadows.glassSubtle;
    }
  })();

  const glowStyle = (() => {
    if (glow === 'gold') return titanShadows.goldGlow;
    if (glow === 'ruby') return titanShadows.rubyGlow;
    return {};
  })();

  return (
    <View
      style={[
        styles.container,
        shadowStyle,
        glowStyle,
        { borderRadius },
        style,
      ]}
    >
      {/* Glass highlight gradient overlay */}
      <LinearGradient
        colors={[
          titanColors.background.glassHighlight,
          'transparent',
          'transparent',
        ]}
        locations={[0, 0.3, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        pointerEvents="none"
      />
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
  content: {
    // Content wrapper for padding
  },
});

export default GlassTile;
