import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { HapticsService } from '../lib/HapticsService';
import { HAPTIC_BUTTON_SCALES } from '../config/haptics';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { colors, typography } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import { ensureHttps } from '../utils/googleBooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BookData = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
};

type CommitmentDetail = {
  id: string;
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  created_at: string;
  target_pages: number;
  is_freeze_used: boolean;
  book: BookData;
};

type CommitmentQueryResult = Omit<CommitmentDetail, 'book'> & {
  book: BookData | BookData[];
};

export default function CommitmentDetailScreen({ route, navigation }: any) {
  const id = route?.params?.id;
  const [commitment, setCommitment] = useState<CommitmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lifelineUsedForBook, setLifelineUsedForBook] = useState(false);
  const [lifelineLoading, setLifelineLoading] = useState(false);

  // Button press scale for Piano Black luxury feel
  const verifyButtonScale = useSharedValue(1);
  const lifelineButtonScale = useSharedValue(1);

  const verifyButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifyButtonScale.value }],
  }));

  const lifelineButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lifelineButtonScale.value }],
  }));

  const handleVerifyPressIn = () => {
    verifyButtonScale.value = withSpring(
      HAPTIC_BUTTON_SCALES.heavy.pressed,
      HAPTIC_BUTTON_SCALES.heavy.spring
    );
  };

  const handleVerifyPressOut = () => {
    verifyButtonScale.value = withSpring(1, HAPTIC_BUTTON_SCALES.heavy.spring);
  };

  const handleLifelinePressIn = () => {
    lifelineButtonScale.value = withSpring(
      HAPTIC_BUTTON_SCALES.medium.pressed,
      HAPTIC_BUTTON_SCALES.medium.spring
    );
  };

  const handleLifelinePressOut = () => {
    lifelineButtonScale.value = withSpring(1, HAPTIC_BUTTON_SCALES.medium.spring);
  };

  const fetchCommitment = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('commitments')
        .select(`
          id,
          deadline,
          status,
          pledge_amount,
          currency,
          created_at,
          target_pages,
          is_freeze_used,
          book:books(id, title, author, cover_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const queryResult = data as CommitmentQueryResult;
        const normalizedData: CommitmentDetail = {
          ...queryResult,
          book: Array.isArray(queryResult.book) ? queryResult.book[0] : queryResult.book,
        };
        setCommitment(normalizedData);
      }
    } catch (error) {
      console.error('[CommitmentDetailScreen] Fetch error:', error);
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.fetch_commitment_failed'),
        [{ text: i18n.t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    fetchCommitment();
  }, [fetchCommitment]);

  const getCountdown = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, expired: false };
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      JPY: '¥', USD: '$', EUR: '€', GBP: '£', CNY: '¥', KRW: '₩'
    };
    return symbols[currency] || currency;
  };

  const checkLifelineAvailability = useCallback(async (bookId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('commitments')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('book_id', bookId)
        .eq('is_freeze_used', true)
        .limit(1);

      if (error) throw error;
      setLifelineUsedForBook(data && data.length > 0);
    } catch (error) {
      console.error('[CommitmentDetailScreen] Lifeline check error:', error);
    }
  }, []);

  const handleUseLifeline = async () => {
    if (!commitment) return;

    Alert.alert(
      i18n.t('commitment_detail.lifeline_confirm_title'),
      i18n.t('commitment_detail.lifeline_confirm_message'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.ok'),
          onPress: async () => {
            setLifelineLoading(true);
            try {
              const { data, error } = await supabase.functions.invoke('use-lifeline', {
                body: { commitment_id: commitment.id },
              });

              if (error) {
                if (error instanceof FunctionsHttpError) {
                  const errorBody = await error.context.json();
                  throw new Error(errorBody.error || 'Unknown error');
                }
                throw error;
              }

              if (data?.success) {
                Alert.alert(i18n.t('common.success'), i18n.t('commitment_detail.lifeline_success'));
                fetchCommitment();
                setLifelineUsedForBook(true);
              } else if (data?.error) {
                Alert.alert(i18n.t('common.error'), data.error);
              }
            } catch (error: any) {
              console.error('[CommitmentDetailScreen] Lifeline error:', error);
              Alert.alert(
                i18n.t('common.error'),
                error.message || i18n.t('commitment_detail.lifeline_already_used')
              );
            } finally {
              setLifelineLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (commitment?.book?.id) {
      checkLifelineAvailability(commitment.book.id);
    }
  }, [commitment?.book?.id, checkLifelineAvailability]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.text.muted} />
      </SafeAreaView>
    );
  }

  if (!commitment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{i18n.t('errors.commitment_not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const countdown = getCountdown(commitment.deadline);
  const isUrgent = countdown.days <= 3 && !countdown.expired;

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('commitment_detail.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Book Header */}
        <View style={styles.bookHeader}>
          <View style={styles.bookCoverContainer}>
              {ensureHttps(commitment.book.cover_url) ? (
                <Image source={{ uri: ensureHttps(commitment.book.cover_url)! }} style={styles.bookCover} />
              ) : (
                <View style={styles.bookCoverPlaceholder}>
                  <Ionicons name="book-outline" size={40} color={colors.text.muted} />
                </View>
              )}
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{commitment.book.title}</Text>
            <Text style={styles.bookAuthor}>{commitment.book.author}</Text>
            <View style={[
              styles.statusChip, 
              commitment.status === 'completed' && styles.statusChipCompleted,
              commitment.status === 'defaulted' && styles.statusChipFailed
            ]}>
                <Text style={[
                  styles.statusChipText,
                   commitment.status === 'completed' && { color: '#000' }
                ]}>
                    {commitment.status === 'pending' ? 'IN PROGRESS' : commitment.status.toUpperCase()}
                </Text>
            </View>
          </View>
        </View>

        {/* Data List */}
        <View style={styles.dataSection}>
            {commitment.target_pages > 0 && (
                <View style={styles.dataRow}>
                    <MicroLabel>{i18n.t('commitment_detail.target_pages')}</MicroLabel>
                    <TacticalText size={16} color={colors.text.primary}>
                        {commitment.target_pages.toLocaleString()} Pages
                    </TacticalText>
                </View>
            )}

            <View style={styles.dataRow}>
                <MicroLabel>PLEDGED AMOUNT</MicroLabel>
                <TacticalText size={16} color={colors.text.primary}>
                     {getCurrencySymbol(commitment.currency)}{commitment.pledge_amount.toLocaleString()}
                </TacticalText>
            </View>

            <View style={styles.dataRow}>
                <MicroLabel>DEADLINE</MicroLabel>
                <TacticalText size={16} color={colors.text.primary}>
                     {new Date(commitment.deadline).toLocaleDateString()}
                </TacticalText>
            </View>
        </View>

        {/* Countdown */}
        {commitment.status === 'pending' && (
          <View style={styles.countdownSection}>
            <MicroLabel style={{ marginBottom: 12 }}>REMAINING TIME</MicroLabel>
            {countdown.expired ? (
              <Text style={styles.expiredText}>EXPIRED</Text>
            ) : (
              <View style={styles.countdownNumbers}>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.days}
                  </Text>
                  <Text style={styles.countdownUnit}>DAYS</Text>
                </View>
                <View style={styles.countdownItem}>
                  <Text style={[styles.countdownValue, isUrgent && styles.urgentText]}>
                    {countdown.hours}
                  </Text>
                  <Text style={styles.countdownUnit}>HOURS</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionButtonsContainer}>
          {commitment.status === 'pending' && (
            <>
              <Animated.View style={verifyButtonAnimatedStyle}>
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={() => {
                    HapticsService.feedbackHeavy();
                    navigation.navigate('Verification', {
                      commitmentId: commitment.id,
                      bookTitle: commitment.book.title,
                    });
                  }}
                  onPressIn={handleVerifyPressIn}
                  onPressOut={handleVerifyPressOut}
                  activeOpacity={0.9}
                >
                  <Text style={styles.verifyButtonText}>{i18n.t('commitment_detail.verify_button')}</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={lifelineButtonAnimatedStyle}>
                <TouchableOpacity
                  style={[
                      styles.secondaryButton,
                      lifelineUsedForBook && styles.secondaryButtonDisabled
                  ]}
                  onPress={() => {
                    HapticsService.feedbackMedium();
                    handleUseLifeline();
                  }}
                  onPressIn={handleLifelinePressIn}
                  onPressOut={handleLifelinePressOut}
                  disabled={lifelineUsedForBook || lifelineLoading}
                  activeOpacity={0.9}
                >
                  {lifelineLoading ? (
                    <ActivityIndicator size="small" color={colors.text.secondary} />
                  ) : (
                    <Text style={[
                        styles.secondaryButtonText,
                        lifelineUsedForBook && styles.secondaryButtonTextDisabled
                    ]}>
                      {lifelineUsedForBook ? 'FREEZE USED' : 'USE FREEZE (+7 DAYS)'}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </>
          )}

          {commitment.status === 'completed' && (
            <View style={styles.completedMessage}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.signal.success} />
              <Text style={styles.completedText}>{i18n.t('commitment_detail.completed_message')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  // Glassmorphism book header
  bookHeader: {
    flexDirection: 'row',
    marginBottom: 36,
    backgroundColor: 'rgba(26, 23, 20, 0.7)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bookCoverContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  bookCoverPlaceholder: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginBottom: 8,
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 14,
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  statusChipCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  statusChipFailed: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B35',
    letterSpacing: 0.5,
  },
  // Data section - glassmorphism rows
  dataSection: {
    marginBottom: 32,
    backgroundColor: 'rgba(26, 23, 20, 0.6)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  // Chronograph countdown section
  countdownSection: {
    alignItems: 'center',
    marginBottom: 36,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    padding: 32,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Subtle inner glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 4,
  },
  countdownNumbers: {
    flexDirection: 'row',
    gap: 48,
  },
  countdownItem: {
    alignItems: 'center',
  },
  // Giant glowing chronograph numbers
  countdownValue: {
    fontSize: 48,
    fontWeight: '200',
    color: '#FAFAFA',
    letterSpacing: -1,
    // Luxury gauge glow
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  countdownUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 160, 120, 0.5)',
    marginTop: 8,
    letterSpacing: 2,
  },
  urgentText: {
    color: '#FF6B6B',
    // Urgent red glow
    textShadowColor: 'rgba(255, 107, 107, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  expiredText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FF6B6B',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 107, 107, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  actionButtonsContainer: {
    gap: 14,
  },
  // Piano Black verify button with orange glow
  verifyButton: {
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Strong orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  verifyButtonText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Outline secondary button
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.4,
  },
  secondaryButtonText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  completedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
  },
});
