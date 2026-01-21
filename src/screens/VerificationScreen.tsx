import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import VerificationSuccessModal from '../components/VerificationSuccessModal';
import * as AnalyticsService from '../lib/AnalyticsService';
import { ReviewService } from '../lib/ReviewService';
import { captureError } from '../utils/errorLogger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MIN_MEMO_LENGTH = 100;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function VerificationScreen({ route, navigation }: any) {
  const { commitmentId, bookTitle } = route.params;

  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [currency, setCurrency] = useState('JPY');
  const [bookId, setBookId] = useState<string | null>(null);
  // Receipt data
  const [receiptBookTitle, setReceiptBookTitle] = useState('');
  const [receiptBookAuthor, setReceiptBookAuthor] = useState('');
  const [receiptBookCoverUrl, setReceiptBookCoverUrl] = useState<string | undefined>();
  const [receiptCompletionDate, setReceiptCompletionDate] = useState<Date>(new Date());
  const [receiptReadingDays, setReceiptReadingDays] = useState(0);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.camera_permission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageAsset(result.assets[0]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageAsset(result.assets[0]);
    }
  };

  const validateMemo = () => {
    if (memo.length < MIN_MEMO_LENGTH) {
      Alert.alert(
        i18n.t('errors.memo_too_short'),
        i18n.t('errors.memo_length_requirement', {
          length: MIN_MEMO_LENGTH,
          current: memo.length
        }),
        [{ text: i18n.t('common.ok') }]
      );
      return false;
    }
    return true;
  };

  const submitVerification = async () => {
    if (!imageAsset) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.photo_required'));
      return;
    }

    if (!validateMemo()) {
      return;
    }

    // S.7: File size validation (5MB limit)
    if (imageAsset.fileSize && imageAsset.fileSize > MAX_FILE_SIZE) {
      Alert.alert(
        i18n.t('errors.file_too_large_title'),
        i18n.t('errors.file_too_large_message')
      );
      return;
    }

    setLoading(true);

    try {
      // Fetch commitment details with book info for the celebration modal and receipt
      const { data: commitmentData, error: fetchError } = await supabase
        .from('commitments')
        .select(`
          pledge_amount,
          currency,
          book_id,
          created_at,
          books (
            title,
            author,
            cover_url
          )
        `)
        .eq('id', commitmentId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Store book_id for continue flow
      setBookId(commitmentData.book_id);

      // Calculate reading days
      const createdAt = new Date(commitmentData.created_at);
      const completionDate = new Date();
      const readingDays = Math.max(
        1,
        Math.ceil((completionDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Set receipt data
      const bookData = commitmentData.books as { title: string; author: string; cover_url?: string } | null;
      setReceiptBookTitle(bookData?.title || bookTitle);
      setReceiptBookAuthor(bookData?.author || '');
      setReceiptBookCoverUrl(bookData?.cover_url ?? undefined);
      setReceiptCompletionDate(completionDate);
      setReceiptReadingDays(readingDays);

      // 画像をSupabase Storageにアップロード
      const fileName = `verification_${commitmentId}_${Date.now()}.jpg`;
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('verifications')
        .getPublicUrl(fileName);

      // verification_logsに保存
      const { error: logError } = await supabase
        .from('verification_logs')
        .insert({
          commitment_id: commitmentId,
          image_url: publicUrl,
          memo_text: memo,
        });

      if (logError) {
        throw logError;
      }

      // コミットメントのステータスを更新
      const { error: updateError } = await supabase
        .from('commitments')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', commitmentId);

      if (updateError) {
        throw updateError;
      }

      // Phase 8.3: Track commitment completion and verification
      AnalyticsService.commitmentCompleted({
        currency: commitmentData.currency,
        amount_saved: commitmentData.pledge_amount,
        days_to_complete: readingDays,
      });
      AnalyticsService.verificationSubmitted({
        memo_length: memo.length,
      });

      // Show celebration modal instead of Alert
      setSavedAmount(commitmentData.pledge_amount);
      setCurrency(commitmentData.currency);
      setShowSuccessModal(true);
    } catch (error) {
      captureError(error, { location: 'VerificationScreen.handleSubmit', extra: { commitmentId } });
      Alert.alert(i18n.t('common.error'), i18n.t('errors.verification_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    // Phase 4.8: Request review after successful completion (non-blocking)
    ReviewService.attemptReviewRequest();
    navigation.navigate('Dashboard');
  };

  const handleContinue = () => {
    setShowSuccessModal(false);
    // Phase 4.8: Request review after successful completion (non-blocking)
    ReviewService.attemptReviewRequest();
    if (bookId) {
      // Navigate directly to CreateCommitment with bookId to trigger Quick Continue flow
      navigation.navigate('CreateCommitment', { bookId });
    } else {
      navigation.navigate('Dashboard');
    }
  };

  const handleSelectNewBook = () => {
    setShowSuccessModal(false);
    // Phase 4.8: Request review after successful completion (non-blocking)
    ReviewService.attemptReviewRequest();
    // Navigate to RoleSelect to start a fresh book selection flow
    navigation.navigate('RoleSelect');
  };

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
            'rgba(255, 160, 120, 0.04)',
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
          <MaterialIcons name="arrow-back" size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('verification.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.bookTitle}>{bookTitle}</Text>

        {/* 写真撮影セクション - Glassmorphism タイル */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('verification.photo_section')}</Text>
          <Text style={styles.sectionDesc}>{i18n.t('verification.photo_instruction')}</Text>

          {imageAsset ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageAsset?.uri }}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.retakeText}>{i18n.t('verification.retake')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.06)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.7, y: 0.7 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
                <View style={styles.cameraIconGlow}>
                  <Ionicons name="camera" size={28} color="#FF6B35" />
                </View>
                <Text style={styles.photoButtonText}>{i18n.t('verification.take_photo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.06)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.7, y: 0.7 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
                <View style={styles.cameraIconGlow}>
                  <Ionicons name="images" size={28} color="#FF6B35" />
                </View>
                <Text style={styles.photoButtonText}>{i18n.t('verification.choose_photo')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* メモセクション - Liquid Black Metal スタイル */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('verification.memo_section')}</Text>
          <Text style={styles.sectionDesc}>
            {i18n.t('verification.memo_instruction')}
          </Text>

          <View style={styles.memoContainer}>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={setMemo}
              placeholder={i18n.t('verification.memo_placeholder')}
              placeholderTextColor="rgba(200, 160, 120, 0.3)"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          <Text style={[
            styles.charCount,
            memo.length >= MIN_MEMO_LENGTH && styles.charCountValid
          ]}>
            {memo.length} / {MIN_MEMO_LENGTH}{i18n.t('verification.char_count')}
          </Text>
        </View>

        {/* 送信ボタン - Piano Black */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!imageAsset || memo.length < MIN_MEMO_LENGTH) && styles.submitButtonDisabled
          ]}
          onPress={submitVerification}
          disabled={loading || !imageAsset || memo.length < MIN_MEMO_LENGTH}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{i18n.t('verification.submit')}</Text>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Celebration Modal */}
      <VerificationSuccessModal
        visible={showSuccessModal}
        savedAmount={savedAmount}
        currency={currency}
        onClose={handleModalClose}
        onContinue={bookId ? handleContinue : undefined}
        onSelectNewBook={handleSelectNewBook}
        bookTitle={receiptBookTitle}
        bookAuthor={receiptBookAuthor}
        bookCoverUrl={receiptBookCoverUrl}
        completionDate={receiptCompletionDate}
        readingDays={receiptReadingDays}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    zIndex: 1,
  },
  bookTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 28,
    color: '#FAFAFA',
    // Subtle glow
    textShadowColor: 'rgba(255, 160, 120, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#FAFAFA',
  },
  sectionDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 16,
    lineHeight: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  // Glassmorphism タイル（破線ボーダーなし）
  photoButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(26, 23, 20, 0.7)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIconGlow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    // Orange glow
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  photoButtonText: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  retakeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  // Liquid Black Metal スタイル
  memoContainer: {
    backgroundColor: 'rgba(10, 8, 6, 0.9)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    // Inset shadow effect (凹み感)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  memoInput: {
    padding: 18,
    fontSize: 15,
    minHeight: 180,
    color: '#FAFAFA',
    lineHeight: 24,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  charCountValid: {
    color: '#FF6B35',
  },
  // Piano Black ボタン
  submitButton: {
    backgroundColor: '#1A1714',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Glossy highlight
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(26, 23, 20, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
