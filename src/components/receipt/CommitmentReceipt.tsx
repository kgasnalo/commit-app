import React from 'react';
import { View, Text, Image, ImageBackground, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { ensureHttps } from '../../utils/googleBooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Receipt dimensions (9:16 aspect ratio for Instagram Story)
const RECEIPT_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 400);
const RECEIPT_HEIGHT = RECEIPT_WIDTH * (16 / 9);

// Cover image dimensions
const COVER_WIDTH = RECEIPT_WIDTH * 0.32;
const COVER_HEIGHT = COVER_WIDTH * 1.5;

// Monospace font family
const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// Golden ratio for spacing
const PHI = 1.618;
const BASE_UNIT = 8;

export interface CommitmentReceiptProps {
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string;
  completionDate: Date;
  readingDays: number;
  savedAmount?: number;
  currency?: string;
}

export default function CommitmentReceipt({
  bookTitle,
  bookAuthor,
  bookCoverUrl,
  completionDate,
  readingDays,
  savedAmount,
  currency = 'JPY',
}: CommitmentReceiptProps) {
  // Format date in international style (YYYY.MM.DD)
  const formattedDate = completionDate.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/-/g, '.');

  // Get first letter of title for fallback
  const titleInitial = bookTitle.charAt(0).toUpperCase();

  // Format currency amount
  const getCurrencySymbol = (curr: string) => {
    const symbols: { [key: string]: string } = {
      JPY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      CNY: '¥',
      KRW: '₩',
    };
    return symbols[curr] || curr;
  };

  const formattedAmount = savedAmount
    ? `${getCurrencySymbol(currency)}${savedAmount.toLocaleString()}`
    : null;

  // Uniform English units with pluralization (1 DAY / X DAYS)
  const daysDisplay = readingDays === 1 ? '1 DAY' : `${readingDays} DAYS`;

  const secureCoverUrl = ensureHttps(bookCoverUrl);

  return (
    <View style={styles.container}>
      {/* Warm dark gradient base */}
      <LinearGradient
        colors={['#1A1008', '#100A06', '#080604']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background book cover - subtle, blurred (Netflix style) */}
      {secureCoverUrl && (
        <ImageBackground
          source={{ uri: secureCoverUrl }}
          style={styles.backgroundCover}
          blurRadius={30}
          resizeMode="cover"
        >
          {/* Heavy dark overlay to make cover subtle */}
          <LinearGradient
            colors={[
              'rgba(26, 16, 8, 0.85)',
              'rgba(16, 10, 6, 0.9)',
              'rgba(8, 6, 4, 0.95)',
            ]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      )}

      {/* Subtle noise texture overlay */}
      <View style={styles.noiseOverlay} />

      {/* Diagonal warm brushed metal effect */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 160, 120, 0.02)',
          'transparent',
          'rgba(255, 160, 120, 0.015)',
          'transparent',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.brushedMetalDiagonal}
      />

      {/* Warm ambient glow from top-left */}
      <LinearGradient
        colors={['rgba(255, 160, 120, 0.08)', 'rgba(255, 160, 120, 0.02)', 'transparent']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.6 }}
        style={styles.metallicSheen}
      />

      {/* Main content container - cinematic centering */}
      <View style={styles.contentWrapper}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>COMMIT</Text>
          <View style={styles.logoUnderline} />
        </View>

        {/* Book Cover */}
        <View style={styles.coverContainer}>
          {secureCoverUrl ? (
            <Image
              source={{ uri: secureCoverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverFallback}>
              <Text style={styles.coverFallbackText}>{titleInitial}</Text>
            </View>
          )}
        </View>

        {/* Book Title & Author */}
        <View style={styles.bookInfoContainer}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {bookTitle}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {bookAuthor}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Value Retained Section - Golden ratio spacing */}
        <View style={styles.valueSection}>
          <View style={styles.valueLabelRow}>
            <Ionicons name="checkmark-circle" size={18} color="#FF6B35" />
            <Text style={styles.valueLabel}>
              {i18n.t('receipt.value_retained')}
            </Text>
          </View>
          {formattedAmount && (
            <Text style={styles.valueAmount}>{formattedAmount}</Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Completion Details - Horizontal Layout with unified English */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{formattedDate}</Text>
            <Text style={styles.detailLabel}>DATE</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{daysDisplay}</Text>
            <Text style={styles.detailLabel}>PERIOD</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>commit-app.com</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RECEIPT_WIDTH,
    height: RECEIPT_HEIGHT,
    backgroundColor: '#080604',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 160, 120, 0.15)',
    overflow: 'hidden',
    // Deep shadow with subtle warm glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  backgroundCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
    backgroundColor: '#A08060',
  },
  brushedMetalDiagonal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  metallicSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: BASE_UNIT * PHI * 4, // ~52px - cinematic top margin
    paddingBottom: BASE_UNIT * 2, // 16px
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: BASE_UNIT * PHI * 2, // ~26px
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: 8,
    // Subtle warm glow
    textShadowColor: 'rgba(255, 160, 120, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  logoUnderline: {
    marginTop: 8,
    width: 32,
    height: 1,
    backgroundColor: 'rgba(255, 160, 120, 0.3)',
  },
  divider: {
    width: '80%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 160, 120, 0.15)',
  },
  coverContainer: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: BASE_UNIT * PHI, // ~13px
    // Cover shadow with warm tint
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(26, 23, 20, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 160, 120, 0.2)',
  },
  coverFallbackText: {
    fontSize: 48,
    fontWeight: '700',
    color: 'rgba(255, 160, 120, 0.3)',
    fontFamily: MONO_FONT,
  },
  bookInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: BASE_UNIT * PHI, // ~13px
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
    textAlign: 'center',
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  valueSection: {
    alignItems: 'center',
    gap: BASE_UNIT * PHI / 2, // ~6.5px - golden ratio micro spacing
    marginVertical: BASE_UNIT * PHI, // ~13px
  },
  valueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Orange glow label
  valueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Giant glowing amount
  valueAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FAFAFA',
    fontFamily: MONO_FONT,
    letterSpacing: 1,
    marginTop: BASE_UNIT / 2,
    // Strong glow
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginTop: BASE_UNIT * PHI, // ~13px
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 160, 120, 0.2)',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 160, 120, 0.5)',
    letterSpacing: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: MONO_FONT,
    letterSpacing: 1,
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: BASE_UNIT * 3, // 24px
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255, 160, 120, 0.3)',
    letterSpacing: 1.5,
  },
});
