// THE TITAN DESIGN SYSTEM OVERRIDE
import { titanColors, titanTypography, titanShadows } from './titan';

// Map Titan colors to legacy structure for backward compatibility
const compatColors = {
  ...titanColors,
  // Legacy Accent mappings
  accent: {
    primary: titanColors.signal.active, // Neon Red
    primaryHover: titanColors.signal.danger,
  },
  // Legacy Status mappings
  status: {
    success: titanColors.signal.success, // Gold
    warning: titanColors.signal.warning, // Amber
    error: titanColors.signal.danger, // Crimson
  },
  // Legacy Border mappings
  border: {
    ...titanColors.border,
    default: titanColors.border.subtle,
    selected: titanColors.signal.active,
  },
};

// Re-export Titan tokens as the default theme
export const colors = compatColors;
export const typography = titanTypography;
export const shadows = titanShadows;

// Keep existing layout tokens
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64, 
};

export const borderRadius = {
  xs: 2, 
  sm: 4,
  md: 8,
  lg: 12, 
  xl: 16,
  full: 9999,
};

export * from './titan';
