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
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Book } from '../types';
import i18n from '../i18n';
import { GOOGLE_API_KEY } from '../config/env';
import AnimatedPageSlider from '../components/AnimatedPageSlider';
import { getErrorMessage } from '../utils/errorUtils';

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

const VIGNETTE_INTENSITY = [0, 0.15, 0.25, 0.35, 0.45];

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
      {/* Top-left corner gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.6 }}
        style={vignetteStyles.corner}
      />
      {/* Top-right corner gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.6 }}
        style={[vignetteStyles.corner, vignetteStyles.topRight]}
      />
      {/* Bottom-left corner gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.6, y: 0.4 }}
        style={[vignetteStyles.corner, vignetteStyles.bottomLeft]}
      />
      {/* Bottom-right corner gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.4, y: 0.4 }}
        style={[vignetteStyles.corner, vignetteStyles.bottomRight]}
      />
    </Animated.View>
  );
};

const vignetteStyles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: '60%',
    height: '40%',
    top: 0,
    left: 0,
  },
  topRight: {
    left: undefined,
    right: 0,
  },
  bottomLeft: {
    top: undefined,
    bottom: 0,
  },
  bottomRight: {
    top: undefined,
    bottom: 0,
    left: undefined,
    right: 0,
  },
});

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
          withTiming(1.05, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 300, easing: Easing.in(Easing.ease) }),
          withTiming(1.03, { duration: 200, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 400, easing: Easing.in(Easing.ease) }),
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
      console.log('[ContinueFlow] progress:', progress);
      console.log('[ContinueFlow] totalPagesRead:', progress.totalPagesRead);
      setTotalPagesRead(progress.totalPagesRead);

      // Calculate and set slider start position
      const sliderStart = calculateSliderStartPage(progress.totalPagesRead);
      console.log('[ContinueFlow] sliderStart:', sliderStart);
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
          <Ionicons name="book-outline" size={large ? 48 : 32} color="#ccc" />
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const selectedDay = new Date(selectedDate);
      selectedDay.setHours(0, 0, 0, 0);

      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 1);
      maxDate.setHours(23, 59, 59, 999);

      // 1ヶ月以上先のチェック
      if (selectedDay > maxDate) {
        Alert.alert(
          i18n.t('errors.deadline_error'),
          i18n.t('errors.deadline_max_one_month'),
          [{ text: i18n.t('common.ok') }]
        );
        return;
      }

      // 明日以降のチェック
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (selectedDay < tomorrow) {
        Alert.alert(
          i18n.t('errors.deadline_error'),
          i18n.t('errors.deadline_tomorrow_or_later'),
          [{ text: i18n.t('common.ok') }]
        );
        return;
      }

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
    console.log('[CreateCommitment] Starting commitment creation...');

    try {
      // 1. ユーザー情報取得
      console.log('[CreateCommitment] Step 1: Fetching user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('[CreateCommitment] User fetch error:', userError);
        throw userError;
      }
      if (!user) {
        console.error('[CreateCommitment] No user found');
        throw new Error('User not authenticated');
      }
      console.log('[CreateCommitment] User found:', user.id);

      // 2. 書籍をDBに保存（既存チェック）
      console.log('[CreateCommitment] Step 2: Checking for existing book...');
      let bookId: string;
      const { data: existingBook, error: existingBookError } = await supabase
        .from('books')
        .select('id')
        .eq('google_books_id', selectedBook.id)
        .single();

      if (existingBookError && existingBookError.code !== 'PGRST116') {
        // PGRST116 = "No rows returned" which is expected if book doesn't exist
        console.error('[CreateCommitment] Error checking existing book:', existingBookError);
        throw existingBookError;
      }

      if (existingBook) {
        bookId = existingBook.id;
        console.log('[CreateCommitment] Existing book found:', bookId);
      } else {
        console.log('[CreateCommitment] Step 2b: Inserting new book...');
        // Convert empty string to null for cover_url
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

        if (bookError) {
          console.error('[CreateCommitment] Book insert error:', bookError);
          throw bookError;
        }
        bookId = newBook.id;
        console.log('[CreateCommitment] New book created:', bookId);
      }

      // 3. コミットメント作成
      console.log('[CreateCommitment] Step 3: Creating commitment...');
      
      // Calculate delta for target_pages (Quantity to read)
      // Slider returns "Ending Page Number", but DB expects "Page Quantity" because getBookProgress sums them.
      const pagesToRead = Math.max(1, pageCount - totalPagesRead);
      
      console.log('[CreateCommitment] Commitment data:', {
        user_id: user.id,
        book_id: bookId,
        deadline: deadline.toISOString(),
        pledge_amount: pledgeAmount,
        currency: currency,
        target_pages: pagesToRead,
        start_page: totalPagesRead, // Log for debug
        end_page: pageCount // Log for debug
      });

      const { data: commitmentData, error: commitmentError } = await supabase
        .from('commitments')
        .insert({
          user_id: user.id,
          book_id: bookId,
          deadline: deadline.toISOString(),
          status: 'pending',
          pledge_amount: pledgeAmount,
          currency: currency,
          target_pages: pagesToRead,
        })
        .select('id')
        .single();

      if (commitmentError) {
        console.error('[CreateCommitment] Commitment insert error:', commitmentError);
        throw commitmentError;
      }

      console.log('[CreateCommitment] Commitment created successfully:', commitmentData?.id);
      
      // Stop loading spinner BEFORE showing the alert
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
    } finally {
      console.log('[CreateCommitment] Finished (setCreating(false))');
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
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('commitment.create_title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
        {/* 書籍選択セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('commitment.select_book')}</Text>

          {loadingContinueData ? (
            <View style={styles.continueLoadingContainer}>
              <ActivityIndicator color="#000" />
              <Text style={styles.continueLoadingText}>
                {i18n.t('commitment.loading_book_data')}
              </Text>
            </View>
          ) : selectedBook ? (
            <View style={styles.selectedBookCard}>
              <BookThumbnail
                uri={selectedBook.volumeInfo.imageLinks?.thumbnail || selectedBook.volumeInfo.imageLinks?.smallThumbnail}
                large
              />
              <View style={styles.selectedBookInfo}>
                <Text style={styles.selectedBookTitle}>{selectedBook.volumeInfo.title}</Text>
                <Text style={styles.selectedBookAuthor}>{selectedBook.volumeInfo.authors?.join(', ')}</Text>
                {isContinueFlow && totalPagesRead > 0 && (
                  <Text style={styles.progressInfo}>
                    {i18n.t('commitment.pages_read_so_far', {
                      pages: totalPagesRead,
                    })}
                  </Text>
                )}
              </View>
              {!isContinueFlow && (
                <TouchableOpacity onPress={() => setSelectedBook(null)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={i18n.t('commitment.search_placeholder')}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchBooks}
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={searchBooks}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialIcons name="search" size={24} color="#fff" />
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

          {/* Continue Flow info message */}
          {continueInfoMessage && (
            <View style={styles.infoMessageContainer}>
              <MaterialIcons name="info" size={20} color="#4CAF50" />
              <Text style={styles.infoMessageText}>{continueInfoMessage}</Text>
            </View>
          )}
        </View>

        {/* 期限設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('commitment.set_deadline')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={20} color="#666" />
            <Text style={styles.dateButtonText}>
              {deadline.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // 明日以降
              maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 1ヶ月後
            />
          )}
        </View>

        {/* ページ数目標セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('commitment.set_page_count')}</Text>
          <AnimatedPageSlider
            value={pageCount}
            onValueChange={setPageCount}
            minValue={isContinueFlow && totalPagesRead > 0 ? totalPagesRead + 1 : 1}
            maxValue={1000}
          />
          {isContinueFlow && totalPagesRead > 0 && (
            <Text style={styles.sliderMinNote}>
              {i18n.t('commitment.slider_min_note', {
                pages: totalPagesRead,
                next: totalPagesRead + 1,
              })}
            </Text>
          )}
          <Text style={styles.pageCountNote}>
            {i18n.t('commitment.page_count_note')}
          </Text>
        </View>

        {/* ペナルティ設定セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('commitment.set_penalty')}</Text>

          {/* 通貨選択 */}
          <Text style={styles.subsectionTitle}>{i18n.t('commitment.select_currency')}</Text>
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
                  setPledgeAmount(null); // 通貨変更時に金額選択をリセット
                }}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    currency === curr.code && styles.currencyButtonTextSelected,
                  ]}
                >
                  {curr.symbol} {i18n.t(`currencies.${curr.code}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 金額選択 */}
          <Text style={styles.subsectionTitle}>{i18n.t('commitment.select_amount')}</Text>
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
                  // Haptic feedback based on amount tier
                  const tierIndex = AMOUNTS_BY_CURRENCY[currency].indexOf(amount);
                  if (tierIndex >= 2) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    pledgeAmount === amount && styles.amountButtonTextSelected,
                  ]}
                >
                  {CURRENCY_OPTIONS.find(c => c.code === currency)?.symbol}{amount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.trustNote}>
            {i18n.t('commitment.no_charge_disclaimer')}
          </Text>

          <Text style={styles.penaltyNote}>
            {i18n.t('commitment.penalty_note')}
          </Text>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAgreedToPenalty(!agreedToPenalty)}
          >
            <View style={[styles.checkboxBox, agreedToPenalty && styles.checkboxBoxChecked]}>
              {agreedToPenalty && <MaterialIcons name="check" size={18} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              {i18n.t('commitment.agree_terms')}
            </Text>
          </TouchableOpacity>
        </View>

          {/* 作成ボタン */}
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>{i18n.t('commitment.create_button')}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Vignette Overlay - darkens corners based on penalty amount */}
        <VignetteOverlay intensity={vignetteIntensity} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
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
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#000',
    borderRadius: 8,
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
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  bookCover: {
    width: 40,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    width: 40,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  bookAuthor: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  selectedBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  selectedBookCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  placeholderLarge: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  selectedBookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  selectedBookAuthor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  penaltyCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    marginBottom: 16,
  },
  penaltyAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  penaltyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
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
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  currencyButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  currencyButtonTextSelected: {
    color: '#fff',
  },
  amountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24, // Increased spacing to prevent overlap with text below
  },
  amountButton: {
    width: '48%', // Fixed width instead of flex: 1 to ensure proper height calculation with flexWrap
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  amountButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  amountButtonTextSelected: {
    color: '#fff',
  },
  trustNote: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8, // Added top margin for spacing from amount buttons
    marginBottom: 12,
  },
  penaltyNote: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20, // Increased for better spacing before checkbox
  },
  pageCountNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  sliderMinNote: {
    fontSize: 12,
    color: '#2196F3',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  continueLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  continueLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  progressInfo: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  infoMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#2e7d32',
  },
});
