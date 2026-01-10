import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchBookCover } from '../utils/googleBooks';
import { colors, typography } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';

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
const HERO_HEIGHT = 400;

export default function LibraryScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [completedBooks, setCompletedBooks] = useState<Commitment[]>([]);
  const [coverUrls, setCoverUrls] = useState<{ [bookId: string]: string }>({});
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalPledgeValue: 0,
    streak: 0,
  });

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
      calculateStats(data || []);
      fetchMissingCovers(data || []);
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(books: Commitment[]) {
    const totalBooks = books.length;
    const totalPledgeValue = books.reduce((acc, b) => acc + b.pledge_amount, 0);

    const monthsWithBooks = new Set(
      books.filter(book => book.updated_at).map((book) => {
        const date = new Date(book.updated_at!);
        return `${date.getFullYear()}-${date.getMonth()}`;
      })
    );
    setStats({ totalBooks, totalPledgeValue, streak: monthsWithBooks.size });
  }

  async function fetchMissingCovers(books: Commitment[]) {
    const newCoverUrls: { [bookId: string]: string } = {};
    for (const commitment of books) {
      const book = commitment.books;
      if (book.cover_url) continue;
      const coverUrl = await fetchBookCover(book.title, book.author);
      if (coverUrl) newCoverUrls[book.id] = coverUrl;
    }
    if (Object.keys(newCoverUrls).length > 0) {
      setCoverUrls((prev) => ({ ...prev, ...newCoverUrls }));
    }
  }

  const renderHero = () => {
    if (completedBooks.length === 0) return null;
    const latest = completedBooks[0];
    const coverUrl = latest.books.cover_url || coverUrls[latest.books.id];

    return (
      <View style={styles.heroContainer}>
        <ImageBackground
          source={coverUrl ? { uri: coverUrl } : undefined}
          style={[styles.heroBg, !coverUrl && { backgroundColor: colors.background.secondary }]}
          blurRadius={30}
        >
          <LinearGradient
            colors={['rgba(10,10,10,0.2)', 'rgba(10,10,10,0.8)', colors.background.primary]}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroPosterContainer}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.heroPoster} />
                ) : (
                  <View style={[styles.heroPoster, styles.posterPlaceholder]}>
                    <Ionicons name="book" size={40} color={colors.text.muted} />
                  </View>
                )}
              </View>
              <View style={styles.heroInfo}>
                <MicroLabel active style={{ marginBottom: 4 }}>HALL OF FAME</MicroLabel>
                <Text style={styles.heroTitle} numberOfLines={2}>{latest.books.title.toUpperCase()}</Text>
                <View style={styles.heroMeta}>
                   <View style={styles.heroBadge}>
                      <TacticalText size={10} color={colors.signal.success}>SECURED</TacticalText>
                   </View>
                   <TacticalText size={10} color={colors.text.muted} style={{ marginLeft: 8 }}>
                      {new Date(latest.updated_at || latest.created_at).toLocaleDateString()}
                   </TacticalText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    );
  };

  const renderCategoryRow = (title: string, books: Commitment[]) => {
    if (books.length === 0) return null;
    return (
      <View style={styles.categoryRow}>
        <MicroLabel style={styles.categoryTitle}>{title}</MicroLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {books.map((commitment) => {
            const coverUrl = commitment.books.cover_url || coverUrls[commitment.books.id];
            return (
              <TouchableOpacity
                key={commitment.id}
                style={styles.bookCard}
                onPress={() => (navigation as any).navigate('BookDetail', { commitmentId: commitment.id })}
              >
                <View style={styles.posterContainer}>
                  {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.poster} />
                  ) : (
                    <View style={styles.posterPlaceholder}>
                       <Ionicons name="book" size={24} color={colors.text.muted} />
                    </View>
                  )}
                  {commitment.pledge_amount >= 5000 && (
                    <View style={styles.highStakesBadge}>
                      <Ionicons name="flash" size={10} color="#000" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.signal.active} />
      </View>
    );
  }

  const highStakes = completedBooks.filter(b => b.pledge_amount >= 5000);
  const recent = completedBooks.slice(0, 10);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
        {completedBooks.length > 0 ? (
          <>
            {renderHero()}

            {/* Tactical HUD Stats */}
            <View style={styles.statsHud}>
              <View style={styles.statBox}>
                <MicroLabel style={{ fontSize: 8 }}>ASSETS</MicroLabel>
                <TacticalText size={18} weight="bold">{stats.totalBooks}</TacticalText>
              </View>
              <View style={styles.statBox}>
                <MicroLabel style={{ fontSize: 8 }}>SECURED</MicroLabel>
                <TacticalText size={18} weight="bold" color={colors.signal.success}>
                  ¥{stats.totalPledgeValue.toLocaleString()}
                </TacticalText>
              </View>
              <View style={styles.statBox}>
                <MicroLabel style={{ fontSize: 8 }}>STREAK</MicroLabel>
                <TacticalText size={18} weight="bold">{stats.streak}M</TacticalText>
              </View>
            </View>

            {renderCategoryRow("HIGH STAKES MISSIONS", highStakes)}
            {renderCategoryRow("RECENTLY SECURED", recent)}
            
            <View style={{ height: 100 }} />
          </>
        ) : (
          <View style={styles.emptyWrapper}>
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={64} color={colors.text.muted} />
              <MicroLabel style={{ marginTop: 24, fontSize: 14 }}>ARCHIVE EMPTY</MicroLabel>
              <Text style={styles.emptySubtitle}>No completed missions found in current records.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => (navigation as any).navigate('HomeTab', { screen: 'RoleSelect' })}
              >
                <Text style={styles.emptyButtonText}>INITIATE PROTOCOL</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  heroContainer: {
    height: HERO_HEIGHT,
    width: '100%',
  },
  heroBg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 40,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  heroPosterContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  heroPoster: {
    width: 130,
    height: 190,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroInfo: {
    flex: 1,
    marginLeft: 20,
    paddingBottom: 10,
  },
  heroTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 26,
    color: '#FFF',
    marginVertical: 10,
    letterSpacing: 1,
    lineHeight: 32,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: colors.signal.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  statsHud: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: 15,
    marginVertical: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  categoryRow: {
    marginTop: 30,
  },
  categoryTitle: {
    paddingHorizontal: 20,
    marginBottom: 15,
    opacity: 0.6,
    fontSize: 10,
  },
  categoryContent: {
    paddingHorizontal: 15,
  },
  bookCard: {
    marginHorizontal: 5,
  },
  posterContainer: {
    width: 115,
    height: 170,
    backgroundColor: colors.background.card,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
  },
  highStakesBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.signal.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrapper: {
    height: Dimensions.get('window').height - 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptySubtitle: {
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontFamily: typography.fontFamily.body,
  },
  emptyButton: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.signal.active,
    borderRadius: 2,
  },
  emptyButtonText: {
    fontFamily: typography.fontFamily.heading,
    color: '#000',
    fontSize: 14,
    letterSpacing: 1,
  },
});