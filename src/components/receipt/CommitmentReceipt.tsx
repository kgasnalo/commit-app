import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Receipt dimensions (9:16 aspect ratio for Instagram Story)
const RECEIPT_WIDTH = SCREEN_WIDTH * 0.85;
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

  return (
    <View style={styles.container}>
      {/* Subtle noise texture overlay (simulated with gradient pattern) */}
      <View style={styles.noiseOverlay} />

      {/* Diagonal brushed metal hairline gradient (45-degree) */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255,255,255,0.015)',
          'transparent',
          'rgba(255,255,255,0.02)',
          'transparent',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.brushedMetalDiagonal}
      />

      {/* Metallic sheen from top */}
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.01)']}
        locations={[0, 0.35, 1]}
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
          {bookCoverUrl ? (
            <Image
              source={{ uri: bookCoverUrl }}
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
            <Ionicons name="checkmark-circle" size={18} color="#00E676" />
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
    backgroundColor: '#030303',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#333333',
    overflow: 'hidden',
    // Precision-cut metal edge effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundColor: '#888888',
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
    height: '45%',
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
    color: '#FFFFFF',
    letterSpacing: 8,
    textShadowColor: 'rgba(255,255,255,0.06)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  logoUnderline: {
    marginTop: 8,
    width: 32,
    height: 1,
    backgroundColor: '#444444',
  },
  divider: {
    width: '80%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2A2A2A',
  },
  coverContainer: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: BASE_UNIT * PHI, // ~13px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
  },
  coverFallbackText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#333333',
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
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(255,255,255,0.04)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#666666',
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
  valueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E676',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,230,118,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  valueAmount: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: MONO_FONT,
    letterSpacing: 1,
    marginTop: BASE_UNIT / 2, // Golden ratio: smaller gap above amount
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: BASE_UNIT * PHI, // ~13px
  },
  detailItem: {
    alignItems: 'center',
    gap: 3,
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2A2A2A',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
    fontFamily: MONO_FONT,
    letterSpacing: 1,
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: BASE_UNIT * 3, // 24px
  },
  footerText: {
    fontSize: 10,
    color: '#3A3A3A',
    letterSpacing: 1.5,
  },
});
