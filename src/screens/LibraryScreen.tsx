import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
} from '../components/halloffame';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count?: number;
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
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function LibraryScreen() {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [completedBooks, setCompletedBooks] = useState<Commitment[]>([]);
  const [coverUrls, setCoverUrls] = useState<{ [bookId: string]: string }>({});
  const [colorCache, setColorCache] = useState<Record<string, string>>({});

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
          books (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCompletedBooks(data || []);

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

  // Memoized categories
  const highStakes = useMemo(
    () => completedBooks.filter(b => b.pledge_amount >= 5000).slice(0, 10),
    [completedBooks]
  );

  const recent = useMemo(
    () => completedBooks.slice(1, 11), // Exclude hero (first one)
    [completedBooks]
  );

  const renderCategoryRow = (titleKey: string, books: Commitment[]) => {
    if (books.length === 0) return null;
    return (
      <View style={styles.categoryRow}>
        <MicroLabel style={styles.categoryTitle}>
          {i18n.t(`hallOfFame.${titleKey}`)}
        </MicroLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {books.map((commitment, index) => {
            const coverUrl = commitment.books.cover_url || coverUrls[commitment.books.id];
            return (
              <CinematicBookCard
                key={commitment.id}
                coverUrl={coverUrl || null}
                onPress={() =>
                  (navigation as any).navigate('BookDetail', { commitmentId: commitment.id })
                }
                showBadge={true}
                animationDelay={index * 50}
              />
            );
          })}
        </ScrollView>
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
  // Category rows
  categoriesContainer: {
    paddingTop: 24,
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
  categoryContent: {
    paddingHorizontal: 18,
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
