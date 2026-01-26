import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ScanBarcode } from 'lucide-react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { colors, typography } from '../../theme';
import { TacticalText } from '../../components/titan/TacticalText';
import { MicroLabel } from '../../components/titan/MicroLabel';
import i18n from '../../i18n';
import { GOOGLE_API_KEY } from '../../config/env';
import { ensureHttps } from '../../utils/googleBooks';
import { captureError } from '../../utils/errorLogger';

type Book = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
    };
  };
};

export default function OnboardingScreen3({ navigation, route }: any) {
  const { tsundokuCount } = route.params || {};

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const searchBooks = async () => {
    if (!query.trim()) return;
    // Input length limit (security)
    if (query.length > 200) return;
    if (!GOOGLE_API_KEY) {
      if (__DEV__) console.warn('Google Books API key not configured');
      return;
    }
    setLoading(true);
    try {
      // Add timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${GOOGLE_API_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      // Response validation
      if (!response.ok) {
        if (response.status === 429) {
          if (__DEV__) console.warn('[BookSearch] Rate limited by Google Books API');
        }
        setResults([]);
        return;
      }

      const data = await response.json();
      // Validate response structure
      if (!Array.isArray(data.items)) {
        setResults([]);
        return;
      }
      setResults(data.items);
    } catch (error) {
      // Handle AbortError (timeout) separately
      if (error instanceof Error && error.name === 'AbortError') {
        if (__DEV__) console.warn('[BookSearch] Request timed out');
        setResults([]);
        return;
      }
      captureError(error, { location: 'OnboardingScreen3.searchBooks' });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = (book: Book) => {
    navigation.navigate('Onboarding4', { selectedBook: book, tsundokuCount });
  };

  return (
    <OnboardingLayout
      currentStep={4}
      totalSteps={15}
      title={i18n.t('onboarding.screen3_title')}
      subtitle={i18n.t('onboarding.screen3_subtitle')}
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('onboarding.screen3_search_placeholder')}
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchBooks}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}
          activeOpacity={0.7}
        >
          <ScanBarcode size={20} color={colors.signal.active} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchBooks}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBookFound={(book) => {
          handleSelectBook(book);
          setShowScanner(false);
        }}
        onManualSearch={() => setShowScanner(false)}
      />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.signal.active} />
          <MicroLabel style={{ marginTop: 8 }}>{i18n.t('onboarding.screen3_searching')}</MicroLabel>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookItem}
              onPress={() => handleSelectBook(item)}
            >
              {ensureHttps(item.volumeInfo.imageLinks?.thumbnail) ? (
                <Image
                  source={{ uri: ensureHttps(item.volumeInfo.imageLinks?.thumbnail)! }}
                  style={styles.bookCover}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.bookCoverPlaceholder}>
                  <Ionicons name="book-outline" size={24} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {(item.volumeInfo.title ?? i18n.t('onboarding.screen3_no_title')).toUpperCase()}
                </Text>
                <TacticalText size={10} color={colors.text.muted} numberOfLines={1}>
                  {item.volumeInfo.authors?.join(', ').toUpperCase() || i18n.t('onboarding.screen3_unknown_author')}
                </TacticalText>
              </View>
              <Ionicons name="add" size={20} color={colors.signal.active} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length > 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{i18n.t('errors.no_books_found')}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            query.length > 0 && !loading ? (
              <View style={styles.manualEntryContainer}>
                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => navigation.navigate('ManualBookEntry', {
                    fromOnboarding: true,
                    tsundokuCount,
                  })}
                >
                  <MaterialIcons name="add-circle-outline" size={20} color={colors.signal.active} />
                  <Text style={styles.manualEntryText}>
                    {i18n.t('book_search.cant_find_book')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    paddingHorizontal: 16,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.monospace,
    fontSize: 12,
  },
  scanButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.signal.active,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 51, 51, 0.1)',
  },
  searchButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.signal.active,
    borderRadius: 2,
  },
  loaderContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 150,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    padding: 12,
    marginBottom: 8,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  bookCoverPlaceholder: {
    width: 40,
    height: 60,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  bookTitle: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.heading,
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.text.muted,
    fontFamily: typography.fontFamily.monospace,
    fontSize: 12,
  },
  // Manual Entry CTA
  manualEntryContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: colors.signal.active,
    borderStyle: 'dashed',
    gap: 10,
  },
  manualEntryText: {
    color: colors.signal.active,
    fontFamily: typography.fontFamily.heading,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});