import { Platform } from 'react-native';

export const typography = {
  fontFamily: {
    regular: Platform.select({
      ios: 'Hiragino Sans',
      android: 'Noto Sans JP',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'Hiragino Sans',
      android: 'Noto Sans JP',
      default: 'System',
    }),
  },
  fontSize: {
    headingLarge: 32,
    headingMedium: 24,
    headingSmall: 20,
    body: 17,
    bodySmall: 15,
    caption: 14,
    button: 16,
  },
  fontWeight: {
    regular: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    heading: 1.2,
    body: 1.5,
    caption: 1.4,
  },
};
