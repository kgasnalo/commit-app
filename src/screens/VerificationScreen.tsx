import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

const MIN_MEMO_LENGTH = 100;

export default function VerificationScreen({ route, navigation }: any) {
  const { commitmentId, bookTitle } = route.params;

  const [image, setImage] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.camera_permission', { defaultValue: 'カメラへのアクセス許可が必要です' }));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const validateMemo = () => {
    if (memo.length < MIN_MEMO_LENGTH) {
      Alert.alert(
        i18n.t('errors.memo_too_short', { defaultValue: 'メモが短すぎます' }),
        i18n.t('errors.memo_length_requirement', {
          defaultValue: `読書から得た学びを${MIN_MEMO_LENGTH}文字以上で記入してください。\n現在: ${memo.length}文字`,
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
    if (!image) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.photo_required', { defaultValue: '本の最終ページの写真を撮影してください' }));
      return;
    }

    if (!validateMemo()) {
      return;
    }

    setLoading(true);

    try {
      // 画像をSupabase Storageにアップロード
      const fileName = `verification_${commitmentId}_${Date.now()}.jpg`;
      const response = await fetch(image);
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
        .update({ status: 'completed' })
        .eq('id', commitmentId);

      if (updateError) {
        throw updateError;
      }

      Alert.alert(
        i18n.t('verification.success_title', { defaultValue: '読了完了！' }),
        i18n.t('verification.success_message', { defaultValue: 'おめでとうございます！読了が確認されました。' }),
        [{ text: i18n.t('common.ok'), onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('errors.verification_failed', { defaultValue: '読了確認の保存に失敗しました' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('verification.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.bookTitle}>{bookTitle}</Text>

        {/* 写真撮影セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('verification.photo_section')}</Text>
          <Text style={styles.sectionDesc}>{i18n.t('verification.photo_instruction')}</Text>

          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.retakeText}>{i18n.t('verification.retake', { defaultValue: '撮り直す' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera" size={32} color="#000" />
                <Text style={styles.photoButtonText}>{i18n.t('verification.take_photo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="images" size={32} color="#000" />
                <Text style={styles.photoButtonText}>{i18n.t('verification.choose_photo')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* メモセクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.t('verification.memo_section')}</Text>
          <Text style={styles.sectionDesc}>
            {i18n.t('verification.memo_instruction')}
          </Text>

          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder={i18n.t('verification.memo_placeholder')}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <Text style={[
            styles.charCount,
            memo.length >= MIN_MEMO_LENGTH && styles.charCountValid
          ]}>
            {memo.length} / {MIN_MEMO_LENGTH}{i18n.t('verification.char_count')}
          </Text>
        </View>

        {/* 送信ボタン */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!image || memo.length < MIN_MEMO_LENGTH) && styles.submitButtonDisabled
          ]}
          onPress={submitVerification}
          disabled={loading || !image || memo.length < MIN_MEMO_LENGTH}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{i18n.t('verification.submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  bookTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  retakeText: {
    color: '#fff',
    fontSize: 14,
  },
  memoInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  charCountValid: {
    color: '#4caf50',
  },
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
