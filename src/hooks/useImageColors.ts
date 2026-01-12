import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getColors } from 'react-native-image-colors';
import { titanColors } from '../theme/titan';
import { ensureHttps } from '../utils/googleBooks';

// Platform-specific color result types
interface IOSColors {
  platform: 'ios';
  background: string;
  primary: string;
  secondary: string;
  detail: string;
}

interface AndroidColors {
  platform: 'android';
  dominant: string;
  average: string;
  vibrant: string;
  darkVibrant: string;
  lightVibrant: string;
  darkMuted: string;
  lightMuted: string;
  muted: string;
}

// Fallback color when extraction fails
const FALLBACK_COLOR = titanColors.accent.primary; // #FF6B35

// Cache for extracted colors
const colorCache: Record<string, string> = {};

export interface UseImageColorsResult {
  dominantColor: string;
  loading: boolean;
  error: Error | null;
}

/**
 * Extract dominant color from an image URL
 * Uses caching to avoid re-extracting the same image
 */
export function useImageColors(imageUrl: string | null | undefined): UseImageColorsResult {
  const [dominantColor, setDominantColor] = useState<string>(FALLBACK_COLOR);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Ensure HTTPS for iOS ATS
    const secureUrl = ensureHttps(imageUrl);

    if (!secureUrl) {
      setDominantColor(FALLBACK_COLOR);
      return;
    }

    // Check cache first
    if (colorCache[secureUrl]) {
      setDominantColor(colorCache[secureUrl]);
      return;
    }

    const extractColor = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getColors(secureUrl, {
          fallback: FALLBACK_COLOR,
          cache: true,
          key: secureUrl,
        });

        if (!isMounted.current) return;

        let extracted: string = FALLBACK_COLOR;

        if (Platform.OS === 'ios') {
          const iosColors = result as IOSColors;
          // Prefer background > primary > secondary
          extracted = iosColors.background || iosColors.primary || iosColors.secondary || FALLBACK_COLOR;
        } else {
          const androidColors = result as AndroidColors;
          // Prefer dominant > vibrant > muted
          extracted = androidColors.dominant || androidColors.vibrant || androidColors.muted || FALLBACK_COLOR;
        }

        // Cache the result
        colorCache[secureUrl] = extracted;
        setDominantColor(extracted);
      } catch (err) {
        if (!isMounted.current) return;
        console.warn('Color extraction failed:', err);
        setError(err instanceof Error ? err : new Error('Color extraction failed'));
        setDominantColor(FALLBACK_COLOR);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    extractColor();
  }, [imageUrl]);

  return { dominantColor, loading, error };
}

/**
 * Extract colors for multiple images at once
 * Returns a map of imageUrl -> dominantColor
 */
export async function extractColorsFromUrls(
  imageUrls: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Convert to secure URLs and filter
  const secureUrls = imageUrls
    .map(url => ensureHttps(url))
    .filter((url): url is string => {
      if (!url) return false;
      if (colorCache[url]) {
        results[url] = colorCache[url];
        return false;
      }
      return true;
    });

  await Promise.all(
    secureUrls.map(async (url) => {
      try {
        const result = await getColors(url, {
          fallback: FALLBACK_COLOR,
          cache: true,
          key: url,
        });

        let extracted: string = FALLBACK_COLOR;

        if (Platform.OS === 'ios') {
          const iosColors = result as IOSColors;
          extracted = iosColors.background || iosColors.primary || iosColors.secondary || FALLBACK_COLOR;
        } else {
          const androidColors = result as AndroidColors;
          extracted = androidColors.dominant || androidColors.vibrant || androidColors.muted || FALLBACK_COLOR;
        }

        colorCache[url] = extracted;
        results[url] = extracted;
      } catch {
        results[url] = FALLBACK_COLOR;
      }
    })
  );

  return results;
}

/**
 * Get cached color for an image URL (synchronous)
 */
export function getCachedColor(imageUrl: string | null | undefined): string {
  const secureUrl = ensureHttps(imageUrl);
  if (!secureUrl) return FALLBACK_COLOR;
  return colorCache[secureUrl] || FALLBACK_COLOR;
}

/**
 * Clear the color cache (useful for memory management)
 */
export function clearColorCache(): void {
  Object.keys(colorCache).forEach((key) => delete colorCache[key]);
}
