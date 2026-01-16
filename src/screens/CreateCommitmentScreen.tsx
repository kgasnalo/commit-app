import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { HapticsService } from '../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../config/haptics';
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
import { ensureHttps } from '../utils/googleBooks';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { colors, typography } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import * as AnalyticsService from '../lib/AnalyticsService';
import { buildSearchQuery } from '../utils/searchQueryBuilder';
import { filterAndRankResults, GoogleBook as GoogleBookFilter } from '../utils/searchResultFilter';

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

interface ManualBook {
  title: string;
  author: string;
  totalPages: number;
  coverUrl: string | null;
}

interface Props {
  navigation: any;
  route?: {
    params?: {
      preselectedBook?: Book;
      bookId?: string;
      manualBook?: ManualBook;
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

  // Manual Book Entry state
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualBookData, setManualBookData] = useState<ManualBook | null>(route?.params?.manualBook || null);
  const [manualMaxPages, setManualMaxPages] = useState<number>(1000);

  // Vignette and Pulse Animation Shared Values
  const vignetteIntensity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const buttonPressScale = useSharedValue(1); // Piano Black button press scale

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

  // Animated style for create button (combines pulse + press scale)
  const createButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * buttonPressScale.value }],
    shadowOpacity: interpolate(pulseScale.value, [1, 1.02], [0, 0.8]),
    shadowRadius: interpolate(pulseScale.value, [1, 1.02], [0, 10]),
    shadowColor: colors.signal.active,
  }));

  // Button press handlers for Piano Black luxury feel
  const handleCreateButtonPressIn = () => {
    buttonPressScale.value = withTiming(HAPTIC_BUTTON_SCALES.heavy.pressed, { duration: 100 });
  };

  const handleCreateButtonPressOut = () => {
    buttonPressScale.value = withTiming(1, { duration: 100 });
  };

  // Continue Flow initialization
  useEffect(() => {
    const bookId = route?.params?.bookId;
    if (bookId) {
      initializeContinueFlow(bookId);
    }
  }, [route?.params?.bookId]);

  // Manual Book Entry initialization
  useEffect(() => {
    const manualBook = route?.params?.manualBook;
    if (manualBook) {
      setIsManualEntry(true);
      setManualBookData(manualBook);
      setManualMaxPages(manualBook.totalPages);

      // Convert to GoogleBook format for UI compatibility
      const googleBook: GoogleBook = {
        id: `manual_${Date.now()}`, // Temporary ID for UI
        volumeInfo: {
          title: manualBook.title,
          authors: [manualBook.author],
          imageLinks: manualBook.coverUrl
            ? { thumbnail: manualBook.coverUrl }
            : undefined,
        },
      };
      setSelectedBook(googleBook);

      // Set page count to half of total pages as default
      setPageCount(Math.min(Math.ceil(manualBook.totalPages / 2), manualBook.totalPages));
    }
  }, [route?.params?.manualBook]);

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
        id: bookData.google_books_id ?? '',
        volumeInfo: {
          title: bookData.title,
          authors: [bookData.author],
          imageLinks: {
            thumbnail: bookData.cover_url ?? undefined,
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
      id: book.google_books_id ?? '',
      volumeInfo: {
        title: book.title,
        authors: [book.author],
        imageLinks: {
          thumbnail: book.cover_url ?? undefined
        }
      }
    };
  }

  const BookThumbnail = ({ uri, large }: { uri?: string; large?: boolean }) => {
    const secureUri = ensureHttps(uri);
    if (!secureUri) {
      return (
        <View style={large ? styles.placeholderLarge : styles.placeholder}>
          <Ionicons name="book-outline" size={large ? 48 : 32} color={colors.text.muted} />
        </View>
      );
    }
    return (
      <Image
        source={{ uri: secureUri }}
        style={large ? styles.selectedBookCover : styles.bookCover}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    );
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
      // Use smart query builder for better search accuracy
      const parsedQuery = buildSearchQuery({ query: searchQuery });

      // If ISBN detected, try direct lookup first
      if (parsedQuery.type === 'isbn' && parsedQuery.isbnValue) {
        const { data: isbnData } = await supabase.functions.invoke('isbn-lookup', {
          body: { isbn: parsedQuery.isbnValue },
        });
        if (isbnData?.success && isbnData.book) {
          // Convert ISBN lookup result to GoogleBook format
          const googleBook: GoogleBook = {
            id: isbnData.book.id,
            volumeInfo: {
              title: isbnData.book.title,
              authors: isbnData.book.authors,
              imageLinks: isbnData.book.thumbnail
                ? { thumbnail: isbnData.book.thumbnail }
                : undefined,
            },
          };
          handleBookSelect(googleBook);
          setSearching(false);
          return;
        }
      }

      // Standard Google Books search with optimized query
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parsedQuery.googleBooksQuery)}&key=${GOOGLE_API_KEY}&maxResults=15`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        // Filter and rank results for better quality
        const filteredResults = filterAndRankResults(data.items as GoogleBookFilter[]);
        setSearchResults(filteredResults as GoogleBook[]);

        if (filteredResults.length === 0) {
          // All results filtered out
          setSearchResults([]);
        }
      } else {
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
      // Calculate pages to read (delta from current progress)
      const pagesToRead = Math.max(1, pageCount - totalPagesRead);

      // Get cover URL - prefer manual book data if available
      const coverUrl = isManualEntry && manualBookData
        ? manualBookData.coverUrl
        : (selectedBook.volumeInfo.imageLinks?.thumbnail
          || selectedBook.volumeInfo.imageLinks?.smallThumbnail
          || null);

      // Build request body
      const requestBody: Record<string, unknown> = {
        book_title: selectedBook.volumeInfo.title ?? i18n.t('common.untitled'),
        book_author: selectedBook.volumeInfo.authors?.join(', ') || i18n.t('common.unknown_author'),
        book_cover_url: coverUrl,
        deadline: deadline.toISOString(),
        pledge_amount: pledgeAmount,
        currency: currency,
        target_pages: pagesToRead,
      };

      // Add manual entry specific fields
      if (isManualEntry && manualBookData) {
        requestBody.is_manual_entry = true;
        requestBody.book_total_pages = manualBookData.totalPages;
        // google_books_id not needed for manual entries
      } else {
        requestBody.google_books_id = selectedBook.id;
        requestBody.is_manual_entry = false;
      }

      // Call Edge Function for server-side validation and creation
      const { data, error } = await supabase.functions.invoke('create-commitment', {
        body: requestBody,
      });

      if (error) {
        console.error('[CreateCommitment] Edge Function error:', error);
        // Extract detailed error from response body
        if (error.context) {
          try {
            const errorBody = await error.context.json();
            console.error('[CreateCommitment] Error details:', JSON.stringify(errorBody));
          } catch {
            console.error('[CreateCommitment] Could not parse error body');
          }
        }
        throw new Error(i18n.t('errors.create_commitment_failed'));
      }

      if (!data?.success) {
        // Handle validation errors from Edge Function
        const errorCode = data?.error || 'UNKNOWN';
        const errorMessage = i18n.t(`errors.validation.${errorCode}`) !== `errors.validation.${errorCode}`
          ? i18n.t(`errors.validation.${errorCode}`)
          : i18n.t('errors.create_commitment_failed');
        throw new Error(errorMessage);
      }

      // Phase 8.3: Track commitment creation
      const deadlineDays = Math.ceil(
        (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      AnalyticsService.commitmentCreated({
        currency: currency,
        amount: pledgeAmount,
        deadline_days: deadlineDays,
        target_pages: Math.max(1, pageCount - totalPagesRead),
        is_continue_flow: isContinueFlow,
      });

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
        <Text style={styles.bookTitle} numberOfLines={2}>{item.volumeInfo.title ?? i18n.t('common.untitled')}</Text>
        <Text style={styles.bookAuthor}>{item.volumeInfo.authors?.join(', ') || i18n.t('common.unknown_author')}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.text.muted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Titan Background */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <LinearGradient
          colors={['#1A1008', '#100A06', '#080604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Ambient light from top-left */}
        <LinearGradient
          colors={[
            'rgba(255, 160, 120, 0.12)',
            'rgba(255, 160, 120, 0.05)',
            'transparent',
          ]}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('commitment.create_title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
                <Text style={styles.selectedBookTitle}>{(selectedBook.volumeInfo.title ?? i18n.t('common.untitled')).toUpperCase()}</Text>
                <Text style={styles.selectedBookAuthor}>{selectedBook.volumeInfo.authors?.join(', ')?.toUpperCase() || i18n.t('common.unknown_author').toUpperCase()}</Text>
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

              {/* Search Results with FlatList */}
              {searchQuery.length > 0 && !searching && (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBookItem}
                  scrollEnabled={false}
                  style={styles.searchResultsList}
                  contentContainerStyle={styles.searchResultsContent}
                  ListEmptyComponent={
                    <View style={styles.noResultsContainer}>
                      <Text style={styles.noResultsText}>{i18n.t('errors.no_books_found')}</Text>
                    </View>
                  }
                  ListFooterComponent={
                    <View style={styles.manualEntryContainer}>
                      <TouchableOpacity
                        style={styles.manualEntryButtonOutlined}
                        onPress={() => navigation.navigate('ManualBookEntry')}
                      >
                        <MaterialIcons name="add-circle-outline" size={20} color="#FF6B35" />
                        <Text style={styles.manualEntryButtonOutlinedText}>
                          {i18n.t('book_search.cant_find_book')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
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
            maxValue={isManualEntry ? manualMaxPages : 1000}
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
                    HapticsService.feedbackMedium();
                  } else {
                    HapticsService.feedbackLight();
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
              onPress={() => {
                HapticsService.feedbackHeavy();
                handleCreateCommitment();
              }}
              onPressIn={handleCreateButtonPressIn}
              onPressOut={handleCreateButtonPressOut}
              disabled={!selectedBook || !pledgeAmount || !agreedToPenalty || creating}
              activeOpacity={0.9}
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
      </KeyboardAvoidingView>

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
    backgroundColor: '#080604',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH * 1.5,
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  contentWrapper: {
    flex: 1,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginTop: 28,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 160, 120, 0.6)',
    letterSpacing: 1.5,
  },
  // Deep Optical Glass search container
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 52,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 14,
    color: '#FAFAFA',
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    fontWeight: '500',
  },
  scanButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
  },
  searchButton: {
    width: 52,
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    // Orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  searchResults: {
    marginTop: 12,
  },
  searchResultsList: {
    marginTop: 12,
  },
  searchResultsContent: {
    paddingBottom: 16,
  },
  // Glassmorphism book item
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(26, 23, 20, 0.7)',
  },
  bookCover: {
    width: 44,
    height: 66,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  placeholder: {
    width: 44,
    height: 66,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 14,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  bookAuthor: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 4,
  },
  // Selected book - glassmorphism with orange accent
  selectedBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    // Subtle orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  selectedBookCover: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  placeholderLarge: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBookInfo: {
    flex: 1,
    marginLeft: 18,
  },
  selectedBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    lineHeight: 22,
  },
  selectedBookAuthor: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
  },
  closeButton: {
    padding: 8,
  },
  // Date button - glassmorphism
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    gap: 14,
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 10,
    marginTop: 12,
    letterSpacing: 1,
  },
  // Currency buttons - glassmorphism pills
  currencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  currencyButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(26, 23, 20, 0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  currencyButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    // Glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  currencyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  currencyButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Amount buttons - larger glassmorphism tiles
  amountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  amountButton: {
    width: '47%',
    paddingVertical: 20,
    backgroundColor: 'rgba(26, 23, 20, 0.7)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    // Glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  // Checkbox - orange accent
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  checkboxBox: {
    width: 26,
    height: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 23, 20, 0.6)',
  },
  checkboxBoxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    // Glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 18,
  },
  // Piano Black create button with orange glow
  createButton: {
    backgroundColor: '#1A1714',
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 40,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Strong orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  createButtonDisabled: {
    backgroundColor: 'rgba(26, 23, 20, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  continueLoadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  continueLoadingText: {
    marginTop: 14,
    fontSize: 12,
    color: 'rgba(255, 160, 120, 0.5)',
    letterSpacing: 1,
  },
  progressInfo: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 6,
  },
  // Manual Entry CTA styles
  manualEntryContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 12,
    marginBottom: 8,
  },
  manualEntryButtonOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    gap: 10,
  },
  manualEntryButtonOutlinedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});