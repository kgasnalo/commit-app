import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchBookCover } from '../utils/googleBooks';
import { titanColors, titanTypography, titanShadows } from '../theme/titan';
import { MicroLabel } from '../components/titan/MicroLabel';
import { useLanguage } from '../contexts/LanguageContext';
import { useImageColors, extractColorsFromUrls, getCachedColor } from '../hooks/useImageColors';
import {
  HeroBillboard,
  CinematicBookCard,
  GlassFilterBar,
} from '../components/halloffame';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count?: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface BookTag {
  id: string;
  tag_id: string;
  tags: Tag;
}

interface Commitment {
  id: string;
  user_id: string;
  book_id: string;
  deadline: string;
  pledge_amount: number;
  currency: string;
  target_pages: number;
  status: 'pending' | 'completed' | 'defaulted';
  created_at: string;
  updated_at: string | null;
  books: Book;
  book_tags: BookTag[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = 140;
const CARD_SPACING = 12;
const CARD_SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

export default function LibraryScreen() {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [completedBooks, setCompletedBooks] = useState<Commitment[]>([]);
  const [coverUrls, setCoverUrls] = useState<{ [bookId: string]: string }>({});
  const [colorCache, setColorCache] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Dynamic ambient color state
  const ambientColorProgress = useSharedValue(0);
  const currentAmbientColor = useSharedValue('#FF6B35');

  // Get hero book data
  const heroCommitment = completedBooks[0] || null;
  const heroCoverUrl = heroCommitment
    ? heroCommitment.books.cover_url || coverUrls[heroCommitment.books.id]
    : null;

  // Extract color for hero
  const { dominantColor: heroColor } = useImageColors(heroCoverUrl);

  useFocusEffect(
    React.useCallback(() => {
      loadLibraryData();
    }, [])
  );

  async function loadLibraryData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('commitments')
        .select(`
          *,
          books (*),
          book_tags (
            id,
            tag_id,
            tags (*)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCompletedBooks(data || []);

      // Fetch all user tags for filter bar
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      setAllTags(tagsData || []);

      // Fetch missing covers
      const newCoverUrls = await fetchMissingCovers(data || []);
      if (Object.keys(newCoverUrls).length > 0) {
        setCoverUrls(prev => ({ ...prev, ...newCoverUrls }));
      }

      // Pre-extract colors for all books
      const allCoverUrls = (data || []).map(c => c.books.cover_url).filter(Boolean) as string[];
      const colors = await extractColorsFromUrls(allCoverUrls);
      setColorCache(prev => ({ ...prev, ...colors }));
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMissingCovers(books: Commitment[]): Promise<{ [bookId: string]: string }> {
    const newCoverUrls: { [bookId: string]: string } = {};
    for (const commitment of books) {
      const book = commitment.books;
      if (book.cover_url) continue;
      const coverUrl = await fetchBookCover(book.title, book.author);
      if (coverUrl) newCoverUrls[book.id] = coverUrl;
    }
    return newCoverUrls;
  }

  // Generate month filters from completed books
  const monthFilters = useMemo(() => {
    const months = new Set<string>();
    completedBooks.forEach(book => {
      const date = new Date(book.updated_at || book.created_at);
      const monthKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // Newest first
      .map(month => ({ id: month, label: month }));
  }, [completedBooks]);

  // Filter books by selected month and tags
  const filteredBooks = useMemo(() => {
    let result = completedBooks;

    // Filter by month
    if (selectedMonth) {
      result = result.filter(book => {
        const date = new Date(book.updated_at || book.created_at);
        const monthKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    }

    // Filter by tags (AND logic - must have ALL selected tags)
    if (selectedTags.length > 0) {
      result = result.filter(book => {
        const bookTagIds = book.book_tags?.map(bt => bt.tag_id) || [];
        return selectedTags.every(tagId => bookTagIds.includes(tagId));
      });
    }

    return result;
  }, [completedBooks, selectedMonth, selectedTags]);

  // Toggle tag selection (Notion-style multi-select)
  const toggleTagFilter = useCallback((tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  // Memoized categories (filtered)
  const highStakes = useMemo(
    () => filteredBooks.filter(b => b.pledge_amount >= 5000).slice(0, 10),
    [filteredBooks]
  );

  const recent = useMemo(
    () => filteredBooks.slice(1, 11), // Exclude hero (first one)
    [filteredBooks]
  );

  // Netflix-style card renderer with peek effect
  const renderBookCard = useCallback(({ item, index }: { item: Commitment; index: number }) => {
    const coverUrl = item.books.cover_url || coverUrls[item.books.id];
    return (
      <CinematicBookCard
        key={item.id}
        coverUrl={coverUrl || null}
        onPress={() =>
          (navigation as any).navigate('BookDetail', { commitmentId: item.id })
        }
        showBadge={true}
        animationDelay={index * 50}
        style={{ marginRight: CARD_SPACING }}
      />
    );
  }, [coverUrls, navigation]);

  const renderCategoryRow = (titleKey: string, books: Commitment[]) => {
    if (books.length === 0) return null;
    return (
      <View style={styles.categoryRow}>
        <MicroLabel style={styles.categoryTitle}>
          {i18n.t(`hallOfFame.${titleKey}`)}
        </MicroLabel>
        <FlatList
          data={books}
          renderItem={renderBookCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
          // Netflix-style snap behavior
          snapToInterval={CARD_SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          // Peek effect - show partial card at edge
          style={styles.categoryList}
        />
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={titanColors.accent.primary} />
      </View>
    );
  }

  // Empty state
  if (completedBooks.length === 0) {
    return (
      <View style={styles.container}>
        {/* Titan Background */}
        <View style={styles.backgroundContainer} pointerEvents="none">
          <LinearGradient
            colors={['#1A1008', '#100A06', '#080604']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              'rgba(255, 160, 120, 0.1)',
              'rgba(255, 160, 120, 0.04)',
              'transparent',
            ]}
            locations={[0, 0.4, 0.8]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.emptyWrapper}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="trophy-outline" size={48} color={titanColors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {i18n.t('hallOfFame.emptyTitle')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {i18n.t('hallOfFame.emptySubtitle')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => (navigation as any).navigate('HomeTab', { screen: 'RoleSelect' })}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>
                {i18n.t('hallOfFame.startFirst')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Titan Background with dynamic ambient */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        style={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Billboard */}
        {heroCommitment && (
          <HeroBillboard
            commitment={heroCommitment}
            coverUrl={heroCoverUrl || null}
            ambientColor={heroColor}
            onPress={() =>
              (navigation as any).navigate('BookDetail', { commitmentId: heroCommitment.id })
            }
          />
        )}

        {/* Glass Filter Bar - Month and Tag selection */}
        {(monthFilters.length > 1 || allTags.length > 0) && (
          <View style={styles.filterBarContainer}>
            <GlassFilterBar
              filters={monthFilters}
              selectedId={selectedMonth}
              onSelect={setSelectedMonth}
              tags={allTags}
              selectedTags={selectedTags}
              onToggleTag={toggleTagFilter}
            />
          </View>
        )}

        {/* Category Rows */}
        <View style={styles.categoriesContainer}>
          {renderCategoryRow('highStakes', highStakes)}
          {renderCategoryRow('recentlySecured', recent)}
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: titanColors.background.primary,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: titanColors.background.primary,
  },
  content: {
    flex: 1,
  },
  // Filter bar
  filterBarContainer: {
    marginTop: 16,
  },
  // Category rows
  categoriesContainer: {
    paddingTop: 8,
  },
  categoryRow: {
    marginBottom: 32,
  },
  categoryTitle: {
    paddingHorizontal: 24,
    marginBottom: 16,
    fontSize: 11,
    letterSpacing: 1,
    color: titanColors.text.secondary,
  },
  categoryList: {
    overflow: 'visible', // Allow peek effect
  },
  categoryContent: {
    paddingLeft: 24, // Left padding
    paddingRight: SCREEN_WIDTH * 0.15, // Right peek space
  },
  // Empty state
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...titanShadows.ambientGlow,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: titanColors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: titanColors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: titanColors.accent.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    ...titanShadows.ambientGlow,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
