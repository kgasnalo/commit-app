import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { titanColors, titanTypography } from '../../theme/titan';
import i18n from '../../i18n';

interface SecuredBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'engraved' | 'metallic';
  style?: ViewStyle;
}

/**
 * SecuredBadge - Luxury watch engraving style badge
 * Indicates a completed/secured commitment
 *
 * Variants:
 * - default: Simple border style
 * - engraved: Subtle embossed look
 * - metallic: Black card inscription with inner shadow and highlight
 */
export function SecuredBadge({
  size = 'md',
  variant = 'engraved',
  style
}: SecuredBadgeProps) {
  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  const textSizeStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  };

  const variantStyles = {
    default: styles.default,
    engraved: styles.engraved,
    metallic: styles.metallic,
  };

  const textVariantStyles = {
    default: styles.textDefault,
    engraved: styles.textDefault,
    metallic: styles.textMetallic,
  };

  return (
    <View
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        style,
      ]}
    >
      {/* Inner highlight for metallic effect */}
      {variant === 'metallic' && (
        <View style={styles.metallicHighlight} />
      )}
      <Text style={[
        styles.text,
        textSizeStyles[size],
        textVariantStyles[variant],
      ]}>
        {i18n.t('hallOfFame.secured')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  // Engraved variant - luxury watch inscription style
  engraved: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderRadius: 4,
    // Subtle inner shadow effect simulation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  // Default variant - simple border style
  default: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: titanColors.accent.success,
    borderRadius: 4,
  },
  // Metallic variant - Black card inscription style
  // Simulates metal plate with embossed text
  metallic: {
    backgroundColor: 'rgba(20, 20, 18, 0.95)',
    borderRadius: 6,
    // Outer subtle glow
    shadowColor: 'rgba(52, 199, 89, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    // Top highlight edge for 3D depth
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    // Bottom shadow edge
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.4)',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Inner highlight shimmer for metallic effect
  metallicHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  // Size variants
  sizeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sizeMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sizeLg: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  // Text styling
  text: {
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  textDefault: {
    color: titanColors.accent.success,
  },
  // Metallic text - embossed inscription effect
  textMetallic: {
    color: '#4ADE80', // Brighter green for contrast
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    // Subtle inner glow
    opacity: 0.95,
  },
  textSm: {
    fontSize: 12,
  },
  textMd: {
    fontSize: 12,
  },
  textLg: {
    fontSize: 12,
  },
});

export default SecuredBadge;
