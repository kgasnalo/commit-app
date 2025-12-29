import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { colors, typography, borderRadius, spacing } from '../../theme';

const GOOGLE_BOOKS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

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

export default function OnboardingScreen3({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const searchBooks = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${GOOGLE_BOOKS_API_KEY}`
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
    // 選択した本を保存（Context or AsyncStorage）
    navigation.navigate('Onboarding4', { selectedBook: book });
  };

  return (
    <OnboardingLayout
      currentStep={3}
      totalSteps={14}
      title="次に読み切る1冊を決めよう。"
      subtitle="「いつか読む」の『いつか』を、今日にする。"
    >
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="書籍タイトルを入力"
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchBooks}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookItem}
              onPress={() => handleSelectBook(item)}
            >
              {item.volumeInfo.imageLinks?.thumbnail ? (
                <Image
                  source={{ uri: item.volumeInfo.imageLinks.thumbnail }}
                  style={styles.bookCover}
                />
              ) : (
                <View style={styles.bookCoverPlaceholder}>
                  <Ionicons name="book-outline" size={24} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.volumeInfo.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.volumeInfo.authors?.join(', ') || '著者不明'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Text style={styles.note}>後で変更できます</Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
  },
  loader: {
    marginTop: spacing.xl,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bookCover: {
    width: 50,
    height: 70,
    borderRadius: borderRadius.sm,
  },
  bookCoverPlaceholder: {
    width: 50,
    height: 70,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bookTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  bookAuthor: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.caption,
  },
  note: {
    color: colors.text.muted,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
