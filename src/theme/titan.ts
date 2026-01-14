import { Platform } from 'react-native';

/**
 * THE TITAN DESIGN SYSTEM
 * aesthetic: "Real Luxury", "Matte & Heavy", "Centurion Black"
 */

export const titanColors = {
  // Base Layers - 参考デザイン: 暖色系ダークブラウン
  background: {
    primary: '#0D0B09', // 暖かみのあるオブシディアン
    secondary: '#141210', // 暖かみのあるダーク
    tertiary: '#1A1714', // カード背景
    card: '#1A1714', // カード (暖色系)
    cardHighlight: '#252119', // ホバー/選択時
    overlay: 'rgba(13, 11, 9, 0.95)',
    glass: 'rgba(255, 255, 255, 0.03)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',
  },

  // アクセントカラー - オレンジメイン
  accent: {
    primary: '#FF6B35', // メインオレンジ
    primaryMuted: 'rgba(255, 107, 53, 0.15)', // バッジ背景
    secondary: '#FF8F5C', // 明るいオレンジ
    success: '#34C759', // グリーン（Delivered等）
    successMuted: 'rgba(52, 199, 89, 0.15)',
  },

  // メタリックアクセント（レガシー互換）
  metal: {
    silver: '#808080',
    platinum: '#E5E4E2',
    gunmetal: '#2C3539',
    gold: '#C5A059',
  },

  // シグナル
  signal: {
    danger: '#FF6B6B',
    dangerGlow: 'rgba(255, 107, 107, 0.3)',
    active: '#FF6B35', // オレンジ
    activeGlow: 'rgba(255, 107, 53, 0.3)',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5AC8FA',
  },

  // テキスト
  text: {
    primary: '#FAFAFA',
    secondary: '#9A9590', // 暖色系グレー
    muted: '#5C5550',
    highlight: '#FFFFFF',
  },

  // ボーダー
  border: {
    subtle: '#2A2520', // 暖色系ボーダー
    bright: '#3D3530',
    orange: '#FF6B35', // オレンジボーダー
    orangeMuted: 'rgba(255, 107, 53, 0.3)',
  },

  // タグ色
  tag: {
    purple: '#8B5CF6',
    pink: '#EC4899',
  },
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