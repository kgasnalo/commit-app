import { Platform } from 'react-native';

/**
 * THE TITAN DESIGN SYSTEM
 * aesthetic: "Real Luxury", "Matte & Heavy", "Centurion Black"
 */

export const titanColors = {
  // Base Layers (Surface) - Mercedes MBUX inspired
  background: {
    primary: '#050505', // Obsidian Black (deepest layer)
    secondary: '#0A0A0A', // Piano Black (elevated surfaces)
    tertiary: '#111111', // Elevated surface
    card: '#080808', // Card base (glass tile foundation)
    overlay: 'rgba(0, 0, 0, 0.9)',
    glass: 'rgba(255, 255, 255, 0.03)', // Glass overlay
    glassHighlight: 'rgba(255, 255, 255, 0.08)', // Top edge highlight
  },

  // Metallic Accents (Low Saturation)
  metal: {
    silver: '#808080', // Matte Grey
    platinum: '#E5E4E2', // Muted White
    gunmetal: '#2C3539', // Dark Blue Grey
    gold: '#C5A059', // Antique Gold (Matte)
  },

  // Functional Signals (Deep & Rich)
  signal: {
    danger: '#8B1A1A', // Crimson Ruby (richer, deeper)
    dangerGlow: 'rgba(139, 26, 26, 0.4)', // Ruby ambient glow
    active: '#C5A059', // Gold indicates "Active/Premium"
    activeGlow: 'rgba(197, 160, 89, 0.3)', // Gold ambient glow
    success: '#C5A059', // Gold for success
    warning: '#CC5500', // Burnt Orange
    info: '#4A90E2', // Muted Blue
  },

  // Text & UI Elements
  text: {
    primary: '#FAFAFA', // Pure white for metrics
    secondary: '#8A8A8A', // Slightly muted
    muted: '#4A4A4A', // Deep grey
    highlight: '#FFFFFF', // 100% White
  },

  // Borders (Use sparingly - dividers only)
  border: {
    subtle: '#1F1F1F', // Very dark border (dividers only)
    bright: '#333333', // Dividers only
    glow: 'transparent',
    goldGlow: 'transparent',
  }
};

export const titanTypography = {
  fontFamily: {
    monospace: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'Courier',
    }),
    heading: Platform.select({
      ios: 'System', 
      android: 'sans-serif-medium',
      default: 'System',
    }),
    body: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'System',
    }),
    regular: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'System', 
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  
  // "Micro-caps" -> "Elegant Label"
  microCaps: {
    fontSize: 10,
    textTransform: 'none' as const, // No forced uppercase
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },

  // "Tactical Data" -> "Standard Reading"
  tacticalData: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    letterSpacing: 0,
  },

  // Metric display (speedometer style)
  metricLarge: {
    fontSize: 32,
    fontWeight: '200' as const, // Ultra-light
    letterSpacing: -0.5,
  },
  metricMedium: {
    fontSize: 24,
    fontWeight: '300' as const, // Light
    letterSpacing: 0,
  },

  // Compatibility layers
  fontSize: {
    headingLarge: 28, // Smaller headings for elegance
    headingMedium: 22,
    headingSmall: 18,
    body: 15,
    bodySmall: 13,
    caption: 11,
    button: 15,
  },
  fontWeight: {
    regular: '400' as const,
    semibold: '500' as const, // Lighter weights for elegance
    bold: '600' as const,
  },
  lineHeight: {
    heading: 1.3,
    body: 1.6, // More breathing room
    caption: 1.4,
  },
};

export const titanShadows = {
  // Minimal depth (legacy)
  embedded: {
    backgroundColor: '#0A0A0A',
  },
  plate: {
    // Very subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  glow: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Glass panel shadows (Mercedes MBUX style)
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  glassSubtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  // Sunken glass - heavy shadow for "pressed in" effect
  sunkenGlass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  // Glow effects for active/warning states
  goldGlow: {
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 0,
  },
  rubyGlow: {
    shadowColor: '#8B1A1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 0,
  },
  // Ambient orange glow (reference design style)
  ambientGlow: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
};