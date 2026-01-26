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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { TitanBackground } from '../components/titan/TitanBackground';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { HapticsService } from '../lib/HapticsService';
import { colors } from '../theme';
import { captureError } from '../utils/errorLogger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ManualBook {
  title: string;
  author: string;
  totalPages: number;
  coverUrl: string | null;
}

export default function ManualBookEntryScreen({ navigation, route }: any) {
  const { fromOnboarding, tsundokuCount } = route.params || {};

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [coverImage, setCoverImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('manual_entry.validation.title_required'));
      return false;
    }
    if (!author.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('manual_entry.validation.author_required'));
      return false;
    }
    const pages = parseInt(totalPages, 10);
    if (!pages || pages < 1 || pages > 10000) {
      Alert.alert(i18n.t('common.error'), i18n.t('manual_entry.validation.pages_invalid'));
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.camera_permission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [2, 3], // Book cover aspect ratio
    });

    if (!result.canceled && result.assets[0]) {
      // File size check
      if (result.assets[0].fileSize && result.assets[0].fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          i18n.t('errors.file_too_large_title'),
          i18n.t('errors.file_too_large_message')
        );
        return;
      }
      setCoverImage(result.assets[0]);
      HapticsService.feedbackSuccess();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [2, 3],
    });

    if (!result.canceled && result.assets[0]) {
      if (result.assets[0].fileSize && result.assets[0].fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          i18n.t('errors.file_too_large_title'),
          i18n.t('errors.file_too_large_message')
        );
        return;
      }
      setCoverImage(result.assets[0]);
      HapticsService.feedbackSuccess();
    }
  };

  const removeCover = () => {
    setCoverImage(null);
    HapticsService.feedbackLight();
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!coverImage) return null;

    setUploadingCover(true);
    try {
      const fileName = `manual_covers/manual_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

      // Fetch cover image with error handling
      let blob: Blob;
      try {
        const response = await fetch(coverImage.uri);
        if (!response.ok) {
          console.warn(`[ManualBookEntry] Failed to fetch cover: ${response.status}`);
          return null; // Continue without cover image
        }
        blob = await response.blob();
      } catch (fetchError) {
        captureError(fetchError, { location: 'ManualBookEntryScreen.uploadCoverImage' });
        return null; // Continue without cover image
      }

      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Cover upload error:', uploadError);
        // Non-blocking: proceed without cover if upload fails
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('book-covers')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Cover upload exception:', error);
      return null;
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    HapticsService.feedbackMedium();
    setLoading(true);

    try {
      // Upload cover if provided
      const coverUrl = await uploadCoverImage();

      // Create the manual book object
      const manualBook: ManualBook = {
        title: title.trim(),
        author: author.trim(),
        totalPages: parseInt(totalPages, 10),
        coverUrl,
      };

      HapticsService.feedbackSuccess();

      if (fromOnboarding) {
        // Convert to GoogleBook-like format for onboarding flow
        const selectedBook = {
          id: `manual_${Date.now()}`,
          volumeInfo: {
            title: manualBook.title,
            authors: [manualBook.author],
            pageCount: manualBook.totalPages,
            imageLinks: manualBook.coverUrl ? { thumbnail: manualBook.coverUrl } : undefined,
          },
          isManual: true,
          manualBook, // Pass original data for commitment creation
        };
        navigation.navigate('Onboarding4', {
          selectedBook,
          tsundokuCount,
        });
      } else {
        // Navigate to CreateCommitmentScreen with manual book data
        navigation.navigate('CreateCommitment', {
          manualBook,
        });
      }
    } catch (error) {
      captureError(error, { location: 'ManualBookEntryScreen.handleSubmit' });
      console.error('Manual book entry error:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TitanBackground />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color="#FAFAFA" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{i18n.t('manual_entry.title')}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Cover Image Section */}
            <View style={styles.coverSection}>
              <Text style={styles.sectionLabel}>{i18n.t('manual_entry.cover_label')}</Text>

              {coverImage ? (
                <View style={styles.coverPreviewContainer}>
                  <Image
                    source={{ uri: coverImage.uri }}
                    style={styles.coverPreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeCoverButton}
                    onPress={removeCover}
                  >
                    <MaterialIcons name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.coverPlaceholderText}>{i18n.t('manual_entry.no_cover')}</Text>
                </View>
              )}

              <View style={styles.coverButtonsRow}>
                <TouchableOpacity style={styles.coverButton} onPress={takePhoto}>
                  <MaterialIcons name="camera-alt" size={20} color="#FF6B35" />
                  <Text style={styles.coverButtonText}>{i18n.t('manual_entry.take_photo')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.coverButton} onPress={pickImage}>
                  <MaterialIcons name="photo-library" size={20} color="#FF6B35" />
                  <Text style={styles.coverButtonText}>{i18n.t('manual_entry.choose_photo')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{i18n.t('manual_entry.title_label')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={i18n.t('manual_entry.title_placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Author Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{i18n.t('manual_entry.author_label')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={i18n.t('manual_entry.author_placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={author}
                  onChangeText={setAuthor}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Total Pages Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{i18n.t('manual_entry.pages_label')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={i18n.t('manual_entry.pages_placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={totalPages}
                  onChangeText={setTotalPages}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="add-circle-outline" size={24} color="#FFF" />
                  <Text style={styles.submitButtonText}>{i18n.t('manual_entry.add_button')}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Cover Section
  coverSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  coverPreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  coverPreview: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
  },
  removeCoverButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholder: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  coverButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    gap: 6,
  },
  coverButtonText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
  },
  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: 'rgba(26, 23, 20, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 52,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: '#FAFAFA',
  },
  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1714',
    borderRadius: 32,
    paddingVertical: 16,
    marginTop: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAFA',
    letterSpacing: 0.5,
  },
});
