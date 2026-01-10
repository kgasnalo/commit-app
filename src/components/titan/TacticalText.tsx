import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

interface TacticalTextProps extends TextProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: 'normal' | 'bold' | 'light';
  glow?: boolean; // Deprecated prop, kept for compatibility but does nothing
}

/**
 * TacticalText (Legacy Name) -> Refactored to "ElegantText" behavior
 * 
 * Used for displaying DATA (Numbers, Currency, Time, Counts).
 * Now uses System Font for a clean, luxury look.
 */
export const TacticalText: React.FC<TacticalTextProps> = ({ 
  children, 
  style, 
  size = 15, 
  color = colors.text.primary,
  weight = 'normal',
  glow = false,
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.base,
        { 
          fontSize: size, 
          color: color,
          fontWeight: weight === 'bold' ? '600' : weight === 'light' ? '300' : '400',
        },
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
    letterSpacing: 0.2, // Slight breathing room
  },
});