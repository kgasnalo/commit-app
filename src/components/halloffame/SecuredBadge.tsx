import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { titanColors, titanTypography } from '../../theme/titan';
import i18n from '../../i18n';

interface SecuredBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'engraved';
  style?: ViewStyle;
}

/**
 * SecuredBadge - Luxury watch engraving style badge
 * Indicates a completed/secured commitment
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

  return (
    <View
      style={[
        styles.base,
        variant === 'engraved' ? styles.engraved : styles.default,
        sizeStyles[size],
        style,
      ]}
    >
      <Text style={[styles.text, textSizeStyles[size]]}>
        {i18n.t('hallOfFame.secured')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Text styling
  text: {
    color: titanColors.accent.success,
    fontWeight: '600',
    letterSpacing: 1,
  },
  textSm: {
    fontSize: 8,
  },
  textMd: {
    fontSize: 10,
  },
  textLg: {
    fontSize: 12,
  },
});

export default SecuredBadge;
