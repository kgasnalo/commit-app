import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import {
  getBookProgress,
  getBookById,
  calculateSliderStartPage,
  calculateSuggestedDeadline,
} from '../lib/commitmentHelpers';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ScanBarcode } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Book } from '../types';
import i18n from '../i18n';
import { GOOGLE_API_KEY } from '../config/env';
import AnimatedPageSlider from '../components/AnimatedPageSlider';
import { getErrorMessage } from '../utils/errorUtils';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { colors, typography } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';

type Currency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'KRW';

// 通貨オプション
const CURRENCY_OPTIONS: { code: Currency; symbol: string }[] = [
  { code: 'JPY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'KRW', symbol: '₩' },
];

// 通貨ごとの金額オプション
const AMOUNTS_BY_CURRENCY: Record<Currency, number[]> = {
  JPY: [1000, 3000, 5000, 10000],
  USD: [7, 20, 35, 70],
  EUR: [6, 18, 30, 60],
  GBP: [5, 15, 25, 50],
  KRW: [9000, 27000, 45000, 90000],
};

// Vignette intensity mapping (0-4 tiers)
const getAmountTierIndex = (amount: number | null, currency: Currency): number => {
  if (amount === null) return 0;
  const amounts = AMOUNTS_BY_CURRENCY[currency];
  const index = amounts.indexOf(amount);
  return index === -1 ? 0 : index + 1;
};

const VIGNETTE_INTENSITY = [0, 0.3, 0.5, 0.7, 0.9]; // Darker vignette for Titan

// VignetteOverlay Component
interface VignetteOverlayProps {
  intensity: SharedValue<number>;
}

const VignetteOverlay: React.FC<VignetteOverlayProps> = ({ intensity }) => {
  const animatedOpacity = useAnimatedStyle(() => ({
    opacity: intensity.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animatedOpacity]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface Props {
  navigation: any;
  route?: {
    params?: {
      preselectedBook?: Book;
      bookId?: string;
    };
  };
}

export default function CreateCommitmentScreen({ navigation, route }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(
    route?.params?.preselectedBook ? convertToGoogleBook(route.params.preselectedBook) : null
  );
  const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // デフォルト30日後
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [agreedToPenalty, setAgreedToPenalty] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // ペナルティ金額と通貨選択
  const [pledgeAmount, setPledgeAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>('JPY');

  // ページ数目標
  const [pageCount, setPageCount] = useState<number>(100);

  // Continue Flow state
  const [isContinueFlow, setIsContinueFlow] = useState(false);
  const [loadingContinueData, setLoadingContinueData] = useState(false);
  const [totalPagesRead, setTotalPagesRead] = useState(0);
  const [continueInfoMessage, setContinueInfoMessage] = useState<string | null>(null);
  const [continueBookIdInternal, setContinueBookIdInternal] = useState<string | null>(null);

  // Vignette and Pulse Animation Shared Values
  const vignetteIntensity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Vignette Effect - darken corners as penalty amount increases
  useEffect(() => {
    const tierIndex = getAmountTierIndex(pledgeAmount, currency);
    const targetIntensity = VIGNETTE_INTENSITY[tierIndex];

    vignetteIntensity.value = withTiming(targetIntensity, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [pledgeAmount, currency]);

  // Pulse Animation - heartbeat effect on create button when ready
  useEffect(() => {
    if (pledgeAmount !== null && selectedBook && agreedToPenalty) {
      // Start heartbeat pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 500, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.in(Easing.ease) }),
        ),
        -1, // Repeat indefinitely
        false // Don't reverse
      );
    } else {
      // Stop animation and reset
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [pledgeAmount, selectedBook, agreedToPenalty]);

  // Animated style for create button
  const createButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    shadowOpacity: interpolate(pulseScale.value, [1, 1.02], [0, 0.8]),
    shadowRadius: interpolate(pulseScale.value, [1, 1.02], [0, 10]),
    shadowColor: colors.signal.active,
  }));

  // Continue Flow initialization
  useEffect(() => {
    const bookId = route?.params?.bookId;
    if (bookId) {
      initializeContinueFlow(bookId);
    }
  }, [route?.params?.bookId]);

  async function initializeContinueFlow(bookId: string) {
    setLoadingContinueData(true);
    setIsContinueFlow(true);
    setContinueBookIdInternal(bookId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch book metadata
      const bookData = await getBookById(bookId);
      if (!bookData) throw new Error('Book not found');

      // Convert to GoogleBook format for compatibility
      const googleBook: GoogleBook = {
        id: bookData.google_books_id,
        volumeInfo: {
          title: bookData.title,
          authors: [bookData.author],
          imageLinks: {
            thumbnail: bookData.cover_url || undefined,
          },
        },
      };
      setSelectedBook(googleBook);

      // Fetch progress data
      const progress = await getBookProgress(bookId, user.id);
      setTotalPagesRead(progress.totalPagesRead);

      // Calculate and set slider start position
      const sliderStart = calculateSliderStartPage(progress.totalPagesRead);
      setPageCount(sliderStart);

      // Show info message if near max
      if (progress.totalPagesRead >= 950) {
        setContinueInfoMessage(
          i18n.t('commitment.progress_near_max', {
            pages: progress.totalPagesRead,
          })
        );
      }

      // Pre-fill settings from last commitment
      if (progress.lastCommitment) {
        // Pre-fill currency
        const lastCurrency = progress.lastCommitment.currency as Currency;
        if (CURRENCY_OPTIONS.some(c => c.code === lastCurrency)) {
          setCurrency(lastCurrency);
        }

        // Pre-fill pledge amount
        const lastAmount = progress.lastCommitment.pledge_amount;
        if (AMOUNTS_BY_CURRENCY[lastCurrency]?.includes(lastAmount)) {
          setPledgeAmount(lastAmount);
        }

        // Calculate suggested deadline
        const suggestedDeadline = calculateSuggestedDeadline(
          progress.lastCommitment.deadline,
          progress.lastCommitment.created_at
        );
        setDeadline(suggestedDeadline);
      }
    } catch (error) {
      console.error('[ContinueFlow] Error:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.continue_flow_failed')
      );
      // Fall back to normal flow
      setIsContinueFlow(false);
      setContinueBookIdInternal(null);
    } finally {
      setLoadingContinueData(false);
    }
  }

  function convertToGoogleBook(book: Book): GoogleBook {
    return {
      id: book.google_books_id,
      volumeInfo: {
        title: book.title,
        authors: [book.author],
        imageLinks: {
          thumbnail: book.cover_url
        }
      }
    };
  }

  const BookThumbnail = ({ uri, large }: { uri?: string; large?: boolean }) => {
    if (!uri) {
      return (
        <View style={large ? styles.placeholderLarge : styles.placeholder}>
          <Ionicons name="book-outline" size={large ? 48 : 32} color={colors.text.muted} />
        </View>
      );
    }
    return <Image source={{ uri }} style={large ? styles.selectedBookCover : styles.bookCover} />;
  };

  const searchBooks = async () => {
    if (!searchQuery.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.search_keyword_required'));
      return;
    }

    if (!GOOGLE_API_KEY) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.google_api_not_configured'));
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}&maxResults=10`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
      } else {
        Alert.alert(i18n.t('errors.no_results'), i18n.t('errors.no_books_found'));
        setSearchResults([]);
      }
    } catch (error: unknown) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.search_failed'));
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleBookSelect = (book: GoogleBook) => {
    setSelectedBook(book);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const handleCreateCommitment = async () => {
    if (!selectedBook) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.select_book'));
      return;
    }

    if (!pledgeAmount) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.select_penalty'));
      return;
    }

    if (!agreedToPenalty) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.agree_penalty'));
      return;
    }

    if (deadline < new Date()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.deadline_future'));
      return;
    }

    // Validate page count for Continue Flow
    if (isContinueFlow && totalPagesRead > 0 && pageCount <= totalPagesRead) {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.page_count_overlap', {
          pages: totalPagesRead,
        })
      );
      return;
    }

    setCreating(true);

    try {
      // 1. ユーザー情報取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // 2. 書籍をDBに保存（既存チェック）
      let bookId: string;
      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('google_books_id', selectedBook.id)
        .single();

      if (existingBook) {
        bookId = existingBook.id;
      } else {
        const coverUrl = selectedBook.volumeInfo.imageLinks?.thumbnail
          || selectedBook.volumeInfo.imageLinks?.smallThumbnail
          || null;

        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            google_books_id: selectedBook.id,
            title: selectedBook.volumeInfo.title,
            author: selectedBook.volumeInfo.authors?.join(', ') || i18n.t('common.unknown_author'),
            cover_url: coverUrl,
          })
          .select('id')
          .single();

        if (bookError) throw bookError;
        bookId = newBook.id;
      }

      // 3. コミットメント作成
      const pagesToRead = Math.max(1, pageCount - totalPagesRead);
      
      const { error: commitmentError } = await supabase
        .from('commitments')
        .insert({
          user_id: user.id,
          book_id: bookId,
          deadline: deadline.toISOString(),
          status: 'pending',
          pledge_amount: pledgeAmount,
          currency: currency,
          target_pages: pagesToRead,
        });

      if (commitmentError) throw commitmentError;
      
      setCreating(false);

      const currencySymbol = CURRENCY_OPTIONS.find(c => c.code === currency)?.symbol || currency;
      Alert.alert(
        i18n.t('common.success'),
        i18n.t('commitment.success_message', {
          deadline: deadline.toLocaleDateString(),
          penalty: `${currencySymbol}${pledgeAmount.toLocaleString()}`
        }),
        [
          {
            text: i18n.t('common.ok'),
            onPress: () => navigation.navigate('Dashboard')
          }
        ]
      );
    } catch (error: unknown) {
      console.error('[CreateCommitment] Error:', error);
      Alert.alert(
        i18n.t('common.error'),
        getErrorMessage(error) || i18n.t('errors.create_commitment_failed')
      );
      setCreating(false);
    }
  };

  const renderBookItem = ({ item }: { item: GoogleBook }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => handleBookSelect(item)}
    >
      <BookThumbnail uri={item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.volumeInfo.title}</Text>
        <Text style={styles.bookAuthor}>{item.volumeInfo.authors?.join(', ') || i18n.t('common.unknown_author')}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.text.muted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <MicroLabel style={styles.title}>{i18n.t('commitment.create_title')}</MicroLabel>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
        >
        {/* SECTION 1: TARGET (Book) */}
        <View style={styles.section}>
          <MicroLabel style={styles.sectionTitle}>1. TARGET ACQUISITION</MicroLabel>

          {loadingContinueData ? (
            <View style={styles.continueLoadingContainer}>
              <ActivityIndicator color={colors.signal.active} />
              <MicroLabel style={styles.continueLoadingText}>
                LOADING ASSET DATA...
              </MicroLabel>
            </View>
          ) : selectedBook ? (
            <View style={styles.selectedBookCard}>
              <BookThumbnail
                uri={selectedBook.volumeInfo.imageLinks?.thumbnail || selectedBook.volumeInfo.imageLinks?.smallThumbnail}
                large
              />
              <View style={styles.selectedBookInfo}>
                <Text style={styles.selectedBookTitle}>{selectedBook.volumeInfo.title.toUpperCase()}</Text>
                <Text style={styles.selectedBookAuthor}>{selectedBook.volumeInfo.authors?.join(', ').toUpperCase()}</Text>
                {isContinueFlow && totalPagesRead > 0 && (
                  <Text style={styles.progressInfo}>
                    PREVIOUSLY SECURED: {totalPagesRead} PGS
                  </Text>
                )}
              </View>
              {!isContinueFlow && (
                <TouchableOpacity onPress={() => setSelectedBook(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="ENTER KEYWORDS / ISBN"
                  placeholderTextColor={colors.text.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchBooks}
                />
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => setShowScanner(true)}
                >
                  <ScanBarcode size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={searchBooks}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Ionicons name="search" size={20} color="#000" />
                  )}
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((item) => (
                    <View key={item.id}>
                      {renderBookItem({ item })}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* SECTION 2: DEADLINE */}
        <View style={styles.section}>
          <MicroLabel style={styles.sectionTitle}>2. TIME LIMIT</MicroLabel>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.signal.active} />
            <TacticalText size={16}>
              {deadline.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </TacticalText>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
              themeVariant="dark"
            />
          )}
        </View>

        {/* SECTION 3: SCOPE (Page Count) */}
        <View style={styles.section}>
          <MicroLabel style={styles.sectionTitle}>3. SCOPE (PAGES)</MicroLabel>
          <AnimatedPageSlider
            value={pageCount}
            onValueChange={setPageCount}
            minValue={isContinueFlow && totalPagesRead > 0 ? totalPagesRead + 1 : 1}
            maxValue={1000}
          />
        </View>

        {/* SECTION 4: STAKE (Penalty) */}
        <View style={styles.section}>
          <MicroLabel style={[styles.sectionTitle, { color: colors.signal.danger }]}>
            4. STAKE (PENALTY)
          </MicroLabel>

          {/* CURRENCY */}
          <MicroLabel style={styles.subsectionTitle}>CURRENCY PROTOCOL</MicroLabel>
          <View style={styles.currencyButtons}>
            {CURRENCY_OPTIONS.map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyButton,
                  currency === curr.code && styles.currencyButtonSelected,
                ]}
                onPress={() => {
                  setCurrency(curr.code);
                  setPledgeAmount(null);
                }}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    currency === curr.code && styles.currencyButtonTextSelected,
                  ]}
                >
                  {curr.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AMOUNT */}
          <MicroLabel style={styles.subsectionTitle}>RISK LEVEL</MicroLabel>
          <View style={styles.amountButtons}>
            {AMOUNTS_BY_CURRENCY[currency].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  pledgeAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => {
                  setPledgeAmount(amount);
                  const tierIndex = AMOUNTS_BY_CURRENCY[currency].indexOf(amount);
                  if (tierIndex >= 2) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <TacticalText
                  size={18}
                  color={pledgeAmount === amount ? '#000' : colors.text.secondary}
                >
                  {CURRENCY_OPTIONS.find(c => c.code === currency)?.symbol}{amount.toLocaleString()}
                </TacticalText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAgreedToPenalty(!agreedToPenalty)}
          >
            <View style={[styles.checkboxBox, agreedToPenalty && styles.checkboxBoxChecked]}>
              {agreedToPenalty && <Ionicons name="checkmark" size={16} color="#000" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I ACCEPT THE CONSEQUENCES OF FAILURE.
            </Text>
          </TouchableOpacity>
        </View>

          {/* CREATE BUTTON */}
          <Animated.View style={createButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.createButton,
                (!selectedBook || !pledgeAmount || !agreedToPenalty) && styles.createButtonDisabled
              ]}
              onPress={handleCreateCommitment}
              disabled={!selectedBook || !pledgeAmount || !agreedToPenalty || creating}
            >
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.createButtonText}>INITIATE MISSION</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Vignette Overlay */}
        <VignetteOverlay intensity={vignetteIntensity} />
      </View>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBookFound={(book) => {
          setSelectedBook(book);
          setShowScanner(false);
        }}
        onManualSearch={() => setShowScanner(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.background.secondary,
  },
  title: {
    fontSize: 12,
    letterSpacing: 2,
    color: colors.text.primary,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginTop: 32,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    color: colors.text.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
    fontFamily: typography.fontFamily.monospace,
  },
  scanButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    backgroundColor: colors.background.card,
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.signal.active,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    marginTop: 12,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    marginBottom: 8,
    backgroundColor: colors.background.card,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: 0,
    backgroundColor: '#333',
  },
  placeholder: {
    width: 40,
    height: 60,
    borderRadius: 0,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.heading,
    color: colors.text.primary,
  },
  bookAuthor: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  selectedBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.signal.active, // Red border for target
    borderRadius: 2,
    backgroundColor: 'rgba(255, 51, 51, 0.05)',
  },
  selectedBookCover: {
    width: 60,
    height: 90,
    borderRadius: 0,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  placeholderLarge: {
    width: 60,
    height: 90,
    borderRadius: 0,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedBookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  selectedBookTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.heading,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  selectedBookAuthor: {
    fontSize: 12,
    fontFamily: typography.fontFamily.monospace,
    color: colors.text.secondary,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    backgroundColor: colors.background.card,
    gap: 12,
  },
  subsectionTitle: {
    fontSize: 10,
    color: colors.text.muted,
    marginBottom: 8,
    marginTop: 8,
  },
  currencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
  },
  currencyButtonSelected: {
    backgroundColor: colors.signal.active,
    borderColor: colors.signal.active,
  },
  currencyButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.monospace,
    color: colors.text.secondary,
  },
  currencyButtonTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
  amountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  amountButton: {
    width: '48%',
    paddingVertical: 16,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountButtonSelected: {
    backgroundColor: colors.signal.active,
    borderColor: colors.signal.active,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.text.muted,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.signal.active,
    borderColor: colors.signal.active,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.fontFamily.monospace,
    color: colors.text.secondary,
  },
  createButton: {
    backgroundColor: colors.signal.active,
    height: 56,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: colors.signal.active,
  },
  createButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.subtle,
    opacity: 0.5,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: typography.fontFamily.heading,
    letterSpacing: 2,
  },
  continueLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  continueLoadingText: {
    marginTop: 12,
    color: colors.text.muted,
  },
  progressInfo: {
    fontSize: 10,
    fontFamily: typography.fontFamily.monospace,
    color: colors.signal.success,
    marginTop: 4,
  },
});