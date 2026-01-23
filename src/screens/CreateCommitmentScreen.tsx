import React, { useState } from 'react';
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
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { HapticsService } from '../lib/HapticsService';
import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ScanBarcode } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Book } from '../types';
import i18n from '../i18n';
import AnimatedPageSlider from '../components/AnimatedPageSlider';
import { getErrorMessage } from '../utils/errorUtils';
import { ensureHttps } from '../utils/googleBooks';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { colors } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import * as AnalyticsService from '../lib/AnalyticsService';
import { getNowDate } from '../lib/DateUtils';
import { Currency, GoogleBook, ManualBook } from '../types/commitment.types';
import { useBookSearch } from '../hooks/useBookSearch';
import { useCommitmentForm } from '../hooks/useCommitmentForm';
import { useContinueFlow } from '../hooks/useContinueFlow';
import { useManualBookEntry } from '../hooks/useManualBookEntry';

// Currency options
const CURRENCY_OPTIONS: { code: Currency; symbol: string }[] = [
  { code: 'JPY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'KRW', symbol: '₩' },
];

const AMOUNTS_BY_CURRENCY: Record<Currency, number[]> = {
  JPY: [1000, 3000, 5000, 10000],
  USD: [7, 20, 35, 70],
  EUR: [6, 18, 30, 60],
  GBP: [5, 15, 25, 50],
  KRW: [9000, 27000, 45000, 90000],
};

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

export default function CreateCommitmentScreen({ navigation, route }: Props) {
  // Core state shared across hooks
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(
    route?.params?.preselectedBook ? convertToGoogleBook(route.params.preselectedBook) : null
  );
  const [creating, setCreating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [bookTotalPages, setBookTotalPages] = useState<number | null>(null);

  // Form hook
  const form = useCommitmentForm({ selectedBook });

  // Book search hook
  const bookSearch = useBookSearch({
    onBookSelect: (book) => {
      setSelectedBook(book);
      if (book.volumeInfo.pageCount) {
        setBookTotalPages(book.volumeInfo.pageCount);
      }
    },
  });

  // Continue flow hook
  const continueFlow = useContinueFlow({
    bookId: route?.params?.bookId,
    onBookSelect: setSelectedBook,
    onBookTotalPages: setBookTotalPages,
    onPageCount: form.setPageCount,
    onCurrency: form.setCurrency,
    onPledgeAmount: form.setPledgeAmount,
    onDeadline: form.setDeadline,
  });

  // Manual book entry hook
  const manualEntry = useManualBookEntry({
    manualBook: route?.params?.manualBook,
    onBookSelect: setSelectedBook,
    onPageCount: form.setPageCount,
  });

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

  const handleCreateCommitment = async () => {
    if (!selectedBook) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.select_book'));
      return;
    }

    if (!form.pledgeAmount) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.select_penalty'));
      return;
    }

    if (!form.agreedToPenalty) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.agree_penalty'));
      return;
    }

    const minDeadline = new Date(getNowDate().getTime() + 24 * 60 * 60 * 1000);
    if (form.deadline < minDeadline) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.validation.DEADLINE_TOO_SOON'));
      return;
    }

    if (continueFlow.isContinueFlow && continueFlow.totalPagesRead > 0 && form.pageCount <= continueFlow.totalPagesRead) {
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.page_count_overlap', {
          pages: continueFlow.totalPagesRead,
        })
      );
      return;
    }

    setCreating(true);

    try {
      const pagesToRead = Math.max(1, form.pageCount - continueFlow.totalPagesRead);

      const coverUrl = manualEntry.isManualEntry && manualEntry.manualBookData
        ? manualEntry.manualBookData.coverUrl
        : (selectedBook.volumeInfo.imageLinks?.thumbnail
          || selectedBook.volumeInfo.imageLinks?.smallThumbnail
          || null);

      const requestBody: Record<string, unknown> = {
        book_title: selectedBook.volumeInfo.title ?? i18n.t('common.untitled'),
        book_author: selectedBook.volumeInfo.authors?.join(', ') || i18n.t('common.unknown_author'),
        book_cover_url: coverUrl,
        deadline: form.deadline.toISOString(),
        pledge_amount: form.pledgeAmount,
        currency: form.currency,
        target_pages: pagesToRead,
      };

      if (manualEntry.isManualEntry && manualEntry.manualBookData) {
        requestBody.is_manual_entry = true;
        requestBody.book_total_pages = manualEntry.manualBookData.totalPages;
      } else {
        requestBody.google_books_id = selectedBook.id;
        requestBody.is_manual_entry = false;
        if (bookTotalPages) {
          requestBody.book_total_pages = bookTotalPages;
        }
      }

      const { data, error } = await supabase.functions.invoke('create-commitment', {
        body: requestBody,
      });

      if (error) {
        console.error('[CreateCommitment] Edge Function error:', error);

        if (error instanceof FunctionsHttpError) {
          try {
            const errorBody = await error.context.json();
            console.error('[CreateCommitment] Error details:', JSON.stringify(errorBody));

            const errorCode = errorBody?.error;
            if (errorCode) {
              const localizedError = i18n.t(`errors.validation.${errorCode}`);
              if (localizedError !== `errors.validation.${errorCode}`) {
                throw new Error(localizedError);
              }
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError || (parseError as Error).message?.includes('JSON')) {
              try {
                const errorText = await error.context.text();
                console.error('[CreateCommitment] Error response (text):', errorText);
              } catch {
                console.error('[CreateCommitment] Could not parse error body');
              }
            } else {
              throw parseError;
            }
          }
        }
        throw new Error(i18n.t('errors.create_commitment_failed'));
      }

      if (!data?.success) {
        const errorCode = data?.error || 'UNKNOWN';
        const errorMessage = i18n.t(`errors.validation.${errorCode}`) !== `errors.validation.${errorCode}`
          ? i18n.t(`errors.validation.${errorCode}`)
          : i18n.t('errors.create_commitment_failed');
        throw new Error(errorMessage);
      }

      const deadlineDays = Math.ceil(
        (form.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      AnalyticsService.commitmentCreated({
        currency: form.currency,
        amount: form.pledgeAmount,
        deadline_days: deadlineDays,
        target_pages: Math.max(1, form.pageCount - continueFlow.totalPagesRead),
        is_continue_flow: continueFlow.isContinueFlow,
      });

      setCreating(false);

      const currencySymbol = CURRENCY_OPTIONS.find(c => c.code === form.currency)?.symbol || form.currency;
      Alert.alert(
        i18n.t('common.success'),
        i18n.t('commitment.success_message', {
          deadline: form.deadline.toLocaleDateString(),
          penalty: `${currencySymbol}${form.pledgeAmount.toLocaleString()}`
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
      onPress={() => bookSearch.handleBookSelect(item)}
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

          {continueFlow.loadingContinueData ? (
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
                {continueFlow.isContinueFlow && continueFlow.totalPagesRead > 0 && (
                  <Text style={styles.progressInfo}>
                    PREVIOUSLY SECURED: {continueFlow.totalPagesRead} PGS
                  </Text>
                )}
              </View>
              {!continueFlow.isContinueFlow && (
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
                  value={bookSearch.searchQuery}
                  onChangeText={bookSearch.setSearchQuery}
                  onSubmitEditing={bookSearch.searchBooks}
                />
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => setShowScanner(true)}
                >
                  <ScanBarcode size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={bookSearch.searchBooks}
                  disabled={bookSearch.searching}
                >
                  {bookSearch.searching ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Ionicons name="search" size={20} color="#000" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Search Results with FlatList */}
              {bookSearch.searchQuery.length > 0 && !bookSearch.searching && (
                <FlatList
                  data={bookSearch.searchResults}
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
            onPress={() => form.setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.signal.active} />
            <TacticalText size={16}>
              {form.deadline.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </TacticalText>
          </TouchableOpacity>

          {form.showDatePicker && (
            <DateTimePicker
              value={form.deadline}
              mode="date"
              display="default"
              onChange={form.handleDateChange}
              minimumDate={new Date(Date.now() + 25 * 60 * 60 * 1000)}
              themeVariant="dark"
            />
          )}
        </View>

        {/* SECTION 3: SCOPE (Page Count) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MicroLabel style={[styles.sectionTitle, { marginBottom: 0 }]}>3. SCOPE (PAGES)</MicroLabel>
            {(bookTotalPages || (manualEntry.isManualEntry && manualEntry.manualMaxPages)) && (
              <MicroLabel style={styles.totalPagesLabel}>
                TOTAL: {manualEntry.isManualEntry ? manualEntry.manualMaxPages : bookTotalPages} PGS
              </MicroLabel>
            )}
          </View>
          <AnimatedPageSlider
            value={form.pageCount}
            onValueChange={form.setPageCount}
            minValue={continueFlow.isContinueFlow && continueFlow.totalPagesRead > 0 ? continueFlow.totalPagesRead + 1 : 1}
            maxValue={manualEntry.isManualEntry ? manualEntry.manualMaxPages : (bookTotalPages || 1000)}
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
                  form.currency === curr.code && styles.currencyButtonSelected,
                ]}
                onPress={() => {
                  form.setCurrency(curr.code);
                  form.setPledgeAmount(null);
                }}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    form.currency === curr.code && styles.currencyButtonTextSelected,
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
            {AMOUNTS_BY_CURRENCY[form.currency].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  form.pledgeAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => {
                  form.setPledgeAmount(amount);
                  const tierIndex = AMOUNTS_BY_CURRENCY[form.currency].indexOf(amount);
                  if (tierIndex >= 2) {
                    HapticsService.feedbackMedium();
                  } else {
                    HapticsService.feedbackLight();
                  }
                }}
              >
                <TacticalText
                  size={18}
                  color={form.pledgeAmount === amount ? '#000' : colors.text.secondary}
                >
                  {CURRENCY_OPTIONS.find(c => c.code === form.currency)?.symbol}{amount.toLocaleString()}
                </TacticalText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => form.setAgreedToPenalty(!form.agreedToPenalty)}
          >
            <View style={[styles.checkboxBox, form.agreedToPenalty && styles.checkboxBoxChecked]}>
              {form.agreedToPenalty && <Ionicons name="checkmark" size={16} color="#000" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I ACCEPT THE CONSEQUENCES OF FAILURE.
            </Text>
          </TouchableOpacity>
        </View>

          {/* CREATE BUTTON */}
          <Animated.View style={form.createButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.createButton,
                (!selectedBook || !form.pledgeAmount || !form.agreedToPenalty) && styles.createButtonDisabled
              ]}
              onPress={() => {
                HapticsService.feedbackHeavy();
                handleCreateCommitment();
              }}
              onPressIn={form.handleCreateButtonPressIn}
              onPressOut={form.handleCreateButtonPressOut}
              disabled={!selectedBook || !form.pledgeAmount || !form.agreedToPenalty || creating}
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
          <VignetteOverlay intensity={form.vignetteIntensity} />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalPagesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
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
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  searchResultsList: {
    marginTop: 12,
  },
  searchResultsContent: {
    paddingBottom: 16,
  },
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
  selectedBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
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
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
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
