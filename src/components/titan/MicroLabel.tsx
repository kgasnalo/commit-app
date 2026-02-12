import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

interface MicroLabelProps extends TextProps {
  children: React.ReactNode;
  color?: string;
  active?: boolean; // If true, uses Active Signal color (Gold/Muted Red)
}

/**
 * MicroLabel
 * 
 * Used for LABELS and CAPTIONS.
 * Style: Small, Elegant, Wide Letter Spacing.
 * No longer forces uppercase.
 */
export const MicroLabel: React.FC<MicroLabelProps> = ({ 
  children, 
  style, 
  color = colors.text.secondary,
  active = false,
  ...props 
}) => {
  const finalColor = active ? colors.signal.active : color;
  
  return (
    <Text 
      style={[
        styles.base,
        { color: finalColor },
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});