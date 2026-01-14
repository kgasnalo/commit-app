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
import { Ionicons } from '@expo/vector-icons';
import { ScanBarcode } from 'lucide-react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import { colors, typography } from '../../theme';
import { TacticalText } from '../../components/titan/TacticalText';
import { MicroLabel } from '../../components/titan/MicroLabel';
import i18n from '../../i18n';
import { GOOGLE_API_KEY } from '../../config/env';
import { ensureHttps } from '../../utils/googleBooks';

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
    if (!GOOGLE_API_KEY) {
      console.warn('Google Books API key not configured');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      setResults(data.items || []);
    } catch (error) {
      console.error('Book search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = (book: Book) => {
    navigation.navigate('Onboarding4', { selectedBook: book, tsundokuCount });
  };

  return (
    <OnboardingLayout
      currentStep={3}
      totalSteps={14}
      title="TARGET IDENTIFICATION"
      subtitle="Select the first book to secure."
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ENTER TITLE / AUTHOR / ISBN"
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
          <MicroLabel style={{ marginTop: 8 }}>SEARCHING DATABASE...</MicroLabel>
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
                  {item.volumeInfo.title.toUpperCase()}
                </Text>
                <TacticalText size={10} color={colors.text.muted} numberOfLines={1}>
                  {item.volumeInfo.authors?.join(', ').toUpperCase() || 'UNKNOWN AUTHOR'}
                </TacticalText>
              </View>
              <Ionicons name="add" size={20} color={colors.signal.active} />
            </TouchableOpacity>
          )}
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
    paddingBottom: 40,
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
});