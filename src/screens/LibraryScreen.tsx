import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchBookCover } from '../utils/googleBooks';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_image_url?: string;
  page_count?: number;
}

interface Commitment {
  id: string;
  user_id: string;
  book_id: string;
  deadline: string;
  penalty_amount: number;
  penalty_currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  books: Book;
  book_tags?: {
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

type ViewMode = 'shelf' | 'grid';

// Generate consistent color from book title
function generateBookColor(title: string): string {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange-Red
    '#6366F1', // Indigo
    '#FF4D00', // Orange (moved to end to reduce orange bias)
  ];

  // Improved hash function with better distribution
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and ensure positive index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function LibraryScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [completedBooks, setCompletedBooks] = useState<Commitment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('shelf');
  const [coverUrls, setCoverUrls] = useState<{ [bookId: string]: string }>({});
  const [stats, setStats] = useState({
    totalBooks: 0,
    monthlyPace: 0,
    streak: 0,
  });

  useFocusEffect(
    React.useCallback(() => {
      loadLibraryData();
    }, [])
  );

  async function loadLibraryData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load completed books with tags
      const { data: booksData, error: booksError } = await supabase
        .from('commitments')
        .select(
          `
          *,
          books (*),
          book_tags (
            tags (*)
          )
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (booksError) throw booksError;

      setCompletedBooks(booksData || []);

      // Load user's tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (tagsError) throw tagsError;

      setTags(tagsData || []);

      // Calculate stats
      calculateStats(booksData || []);

      // Fetch cover images from Google Books API for books without covers
      fetchMissingCovers(booksData || []);
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(books: Commitment[]) {
    const totalBooks = books.length;

    // Calculate monthly pace (books read in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBooks = books.filter(
      (book) => new Date(book.updated_at) >= thirtyDaysAgo
    );
    const monthlyPace = recentBooks.length;

    // Calculate streak (consecutive months with at least one book read)
    const monthsWithBooks = new Set(
      books.map((book) => {
        const date = new Date(book.updated_at);
        return `${date.getFullYear()}-${date.getMonth()}`;
      })
    );

    let streak = 0;
    const now = new Date();
    let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    while (true) {
      const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
      if (monthsWithBooks.has(monthKey)) {
        streak++;
        currentMonth.setMonth(currentMonth.getMonth() - 1);
      } else {
        break;
      }
    }

    setStats({
      totalBooks,
      monthlyPace,
      streak,
    });
  }

  async function fetchMissingCovers(books: Commitment[]) {
    const newCoverUrls: { [bookId: string]: string } = {};

    for (const commitment of books) {
      const book = commitment.books;

      // Skip if book already has a cover image
      if (book.cover_image_url) {
        continue;
      }

      // Fetch cover from Google Books API
      const coverUrl = await fetchBookCover(book.title, book.author);

      if (coverUrl) {
        newCoverUrls[book.id] = coverUrl;
      }
    }

    // Update state with fetched covers
    if (Object.keys(newCoverUrls).length > 0) {
      setCoverUrls((prev) => ({ ...prev, ...newCoverUrls }));
    }
  }

  function getFilteredBooks() {
    if (!selectedTag) return completedBooks;

    return completedBooks.filter((commitment) => {
      const bookTags = commitment.book_tags || [];
      return bookTags.some((bt) => bt.tags.id === selectedTag);
    });
  }

  function groupBooksByMonth(books: Commitment[]) {
    const grouped: { [key: string]: Commitment[] } = {};

    books.forEach((book) => {
      const date = new Date(book.updated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(book);
    });

    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }

  function renderEmptyState() {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="book-outline" size={64} color="#666666" />
        <Text style={styles.emptyTitle}>{i18n.t('library.empty_title')}</Text>
        <Text style={styles.emptySubtitle}>{i18n.t('library.empty_subtitle')}</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => (navigation as any).navigate('CreateCommitment')}
        >
          <Text style={styles.emptyButtonText}>{i18n.t('library.empty_button')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderStatsCard() {
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalBooks}</Text>
          <Text style={styles.statLabel}>{i18n.t('library.total_books')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.monthlyPace}</Text>
          <Text style={styles.statLabel}>{i18n.t('library.monthly_pace')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.streak}</Text>
          <Text style={styles.statLabel}>{i18n.t('library.streak')}</Text>
        </View>
      </View>
    );
  }

  function renderTagFilter() {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagFilterContainer}
        contentContainerStyle={styles.tagFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.tagChip,
            selectedTag === null && styles.tagChipSelected,
          ]}
          onPress={() => setSelectedTag(null)}
        >
          <Text
            style={[
              styles.tagChipText,
              selectedTag === null && styles.tagChipTextSelected,
            ]}
          >
            {i18n.t('library.all')}
          </Text>
        </TouchableOpacity>

        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagChip,
              selectedTag === tag.id && styles.tagChipSelected,
            ]}
            onPress={() => setSelectedTag(tag.id)}
          >
            <View
              style={[styles.tagDot, { backgroundColor: tag.color }]}
            />
            <Text
              style={[
                styles.tagChipText,
                selectedTag === tag.id && styles.tagChipTextSelected,
              ]}
            >
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function renderBookItem(commitment: Commitment) {
    const book = commitment.books;
    const bookColor = generateBookColor(book.title);
    const coverUrl = book.cover_image_url || coverUrls[book.id];

    return (
      <TouchableOpacity
        key={commitment.id}
        style={viewMode === 'grid' ? styles.gridBookItem : styles.shelfBookItem}
        onPress={() =>
          (navigation as any).navigate('BookDetail', { commitmentId: commitment.id })
        }
      >
        {viewMode === 'grid' ? (
          <View style={styles.gridBookContent}>
            <View style={[styles.bookCover, { backgroundColor: bookColor }]}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.bookCoverImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.bookCoverText} numberOfLines={3}>
                  {book.title}
                </Text>
              )}
            </View>
            <Text style={styles.bookTitle} numberOfLines={1}>
              {book.title}
            </Text>
          </View>
        ) : (
          <View style={[styles.bookSpine, { backgroundColor: bookColor }]}>
            <Text style={styles.bookSpineText} numberOfLines={1}>
              {book.title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function renderMonthSection([monthKey, books]: [string, Commitment[]]) {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthName = date.toLocaleDateString(i18n.locale, {
      year: 'numeric',
      month: 'long',
    });

    return (
      <View key={monthKey} style={styles.monthSection}>
        <Text style={styles.monthHeader}>
          {monthName} ({books.length}
          {i18n.t('library.books_count')})
        </Text>
        <View
          style={
            viewMode === 'grid' ? styles.gridContainer : styles.shelfContainer
          }
        >
          {viewMode === 'shelf' && <View style={styles.shelf} />}
          {books.map((commitment) => renderBookItem(commitment))}
        </View>
        <View style={styles.shelfLine} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4D00" />
      </View>
    );
  }

  const filteredBooks = getFilteredBooks();
  const groupedBooks = groupBooksByMonth(filteredBooks);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('library.title')}</Text>
        <View style={styles.viewModeButtons}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'shelf' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('shelf')}
          >
            <Ionicons
              name="albums"
              size={20}
              color={viewMode === 'shelf' ? '#FF4D00' : '#666666'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'grid' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === 'grid' ? '#FF4D00' : '#666666'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {completedBooks.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView style={styles.content}>
          {renderStatsCard()}
          {renderTagFilter()}
          {groupedBooks.map((group) => renderMonthSection(group))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#2A2A2A',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4D00',
  },
  statLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 4,
  },
  tagFilterContainer: {
    marginVertical: 15,
  },
  tagFilterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginRight: 10,
  },
  tagChipSelected: {
    backgroundColor: '#FF4D00',
  },
  tagChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  tagChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  monthSection: {
    marginBottom: 30,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  shelfContainer: {
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  shelf: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#2A2A2A',
    borderTopWidth: 2,
    borderTopColor: '#3A3A3A',
  },
  shelfBookItem: {
    marginRight: 8,
  },
  bookSpine: {
    width: 60,
    height: 200,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  bookSpineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
    width: 180,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  gridBookItem: {
    width: '23%',
    marginBottom: 20,
  },
  gridBookContent: {
    alignItems: 'center',
  },
  bookCover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  bookCoverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 4,
  },
  bookCoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bookTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: '#FF4D00',
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shelfLine: {
    height: 2,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginTop: 15,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
