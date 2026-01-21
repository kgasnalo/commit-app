import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ImageBackground,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useNavigation, useRoute } from '@react-navigation/native';
import BookDetailSkeleton from '../components/BookDetailSkeleton';
import ReceiptPreviewModal from '../components/receipt/ReceiptPreviewModal';
import { colors, typography } from '../theme';
import { TacticalText } from '../components/titan/TacticalText';
import { MicroLabel } from '../components/titan/MicroLabel';
import { LinearGradient } from 'expo-linear-gradient';
import { captureError } from '../utils/errorLogger';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count?: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface BookTag {
  id: string;
  tag_id: string;
  tags: Tag;
}

interface Commitment {
  id: string;
  user_id: string;
  book_id: string;
  deadline: string;
  pledge_amount: number;
  currency: string;
  target_pages: number;
  status: 'pending' | 'completed' | 'defaulted' | 'cancelled';
  created_at: string;
  updated_at: string | null;
  books: Book;
  book_tags: BookTag[];
}

interface VerificationLog {
  id: string;
  commitment_id: string;
  memo_text: string | null;
  created_at: string;
}

const TAG_COLORS = [
  colors.signal.active,
  colors.signal.success,
  colors.signal.warning,
  colors.signal.info,
  colors.tag.purple,
  colors.tag.pink,
];

// Helper to force HTTPS
const ensureHttps = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
};

export default function BookDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { commitmentId } = route.params as { commitmentId: string };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [verificationLog, setVerificationLog] = useState<VerificationLog | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [editedMemo, setEditedMemo] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    loadBookDetail();
  }, [commitmentId]);

  async function loadBookDetail() {
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: commitmentData, error: commitmentError } = await supabase
        .from('commitments')
        .select(
          `
          *,
          books (*),
          book_tags (
            id,
            tag_id,
            tags (*)
          )
        `
        )
        .eq('id', commitmentId)
        .single();

      if (commitmentError) throw commitmentError;

      setCommitment(commitmentData);

      const { data: logData, error: logError } = await supabase
        .from('verification_logs')
        .select('*')
        .eq('commitment_id', commitmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!logError && logData) {
        setVerificationLog(logData);
      }

      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (tagsError) throw tagsError;

      setAllTags(tagsData || []);
    } catch (err) {
      captureError(err, { location: 'BookDetailScreen.loadBookDetail', extra: { commitmentId } });
      console.error('Error loading book detail:', err);
      setError(i18n.t('bookDetail.error_message'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleTag(tagId: string) {
    if (!commitment) return;
    const isTagged = commitment.book_tags.some((bt) => bt.tags.id === tagId);

    try {
      if (isTagged) {
        const bookTag = commitment.book_tags.find((bt) => bt.tags.id === tagId);
        if (!bookTag) return;
        const { error } = await supabase.from('book_tags').delete().eq('id', bookTag.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('book_tags').insert({
          commitment_id: commitment.id,
          tag_id: tagId,
        });
        if (error) throw error;
      }
      await loadBookDetail();
    } catch (error) {
      captureError(error, { location: 'BookDetailScreen.toggleTag' });
      console.error('Error toggling tag:', error);
    }
  }

  async function createNewTag() {
    if (!newTagName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: newTagName.trim(),
          color: selectedColor,
        })
        .select()
        .single();

      if (error) throw error;

      if (data && commitment) {
        await supabase.from('book_tags').insert({
          commitment_id: commitment.id,
          tag_id: data.id,
        });
      }
      setNewTagName('');
      setSelectedColor(TAG_COLORS[0]);
      setShowTagModal(false);
      await loadBookDetail();
    } catch (error) {
      captureError(error, { location: 'BookDetailScreen.createNewTag' });
      console.error('Error creating tag:', error);
    }
  }

  async function updateMemo() {
    if (!verificationLog) return;
    try {
      const { error } = await supabase
        .from('verification_logs')
        .update({ memo_text: editedMemo })
        .eq('id', verificationLog.id);

      if (error) throw error;
      setVerificationLog({ ...verificationLog, memo_text: editedMemo });
      setShowMemoModal(false);
    } catch (error) {
      captureError(error, { location: 'BookDetailScreen.updateMemo' });
      console.error('Error updating memo:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('bookDetail.memo_update_failed'));
    }
  }

  function calculateReadingDays() {
    if (!commitment) return 0;
    const start = new Date(commitment.created_at);
    const end = commitment.updated_at ? new Date(commitment.updated_at) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function renderTagEditModal() {
    if (!commitment) return null;

    return (
      <Modal
        visible={showTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagModal(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowTagModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('library.edit_tags')}</Text>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.tagsGrid}>
                {allTags.map((tag) => {
                  const isSelected = commitment.book_tags.some(
                    (bt) => bt.tags.id === tag.id
                  );

                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.tagModalChip,
                        isSelected && styles.tagModalChipSelected,
                      ]}
                      onPress={() => toggleTag(tag.id)}
                    >
                      <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                      <Text style={[styles.tagModalChipText, isSelected && {color: '#000'}]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.newTagSection}>
                <Text style={styles.newTagTitle}>{i18n.t('library.new_tag')}</Text>
                <TextInput
                  style={styles.newTagInput}
                  placeholder="Tag Name"
                  placeholderTextColor={colors.text.muted}
                  value={newTagName}
                  onChangeText={setNewTagName}
                />

                <View style={styles.colorPicker}>
                  {TAG_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.createTagButton,
                    !newTagName.trim() && styles.createTagButtonDisabled,
                  ]}
                  onPress={createNewTag}
                  disabled={!newTagName.trim()}
                >
                  <Text style={styles.createTagButtonText}>
                    Create Tag
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  function renderMemoEditModal() {
    return (
      <Modal
        visible={showMemoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMemoModal(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowMemoModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('bookDetail.edit_memo_title')}</Text>
            </View>

            <TextInput
              style={styles.memoInput}
              value={editedMemo}
              onChangeText={setEditedMemo}
              placeholder={i18n.t('bookDetail.memo_placeholder')}
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={updateMemo}
              >
                <Text style={styles.saveButtonText}>{i18n.t('bookDetail.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.text.muted} />
      </View>
    );
  }

  if (error || !commitment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>
            {error || i18n.t('errors.unknown')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const book = commitment.books;
  const secureCoverUrl = ensureHttps(book.cover_url);
  const readingDays = calculateReadingDays();
  const isSuccess = commitment.status === 'completed';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView style={styles.content} bounces={false}>
        {/* Cinematic Header */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={secureCoverUrl ? { uri: secureCoverUrl } : undefined}
            style={[styles.heroBg, !secureCoverUrl && { backgroundColor: colors.background.secondary }]}
            blurRadius={30}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', colors.background.primary]}
              style={styles.heroOverlay}
            >
              <SafeAreaView edges={['top']} style={styles.safeHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
              </SafeAreaView>
              
              <View style={styles.heroContent}>
                <View style={styles.posterContainer}>
                  {secureCoverUrl ? (
                    <Image
                      source={{ uri: secureCoverUrl }}
                      style={styles.poster}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.posterPlaceholder}>
                      <Ionicons name="book" size={40} color={colors.text.muted} />
                    </View>
                  )}
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroTitle}>{book.title}</Text>
                  <Text style={styles.heroAuthor}>{book.author}</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Tags Section - Always visible with add button */}
        <View style={styles.tagsSection}>
          <View style={styles.tagsRow}>
            {commitment.book_tags?.map((bt) => (
              <View key={bt.id} style={styles.tagBadge}>
                <View style={[styles.tagDot, { backgroundColor: bt.tags.color }]} />
                <Text style={styles.tagText}>{bt.tags.name}</Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setShowTagModal(true)}
              style={styles.addTagButton}
            >
              <Ionicons name="add-circle" size={24} color={colors.accent.primary} />
              <Text style={styles.addTagText}>{i18n.t('library.add_tag')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Grid */}
        <View style={styles.dataSection}>
          <View style={styles.dataRow}>
            <MicroLabel>COMPLETION DATE</MicroLabel>
            <TacticalText>
              {commitment.updated_at ? new Date(commitment.updated_at).toLocaleDateString() : '-'}
            </TacticalText>
          </View>

          <View style={styles.dataRow}>
            <MicroLabel>VALUE</MicroLabel>
            <TacticalText color={isSuccess ? colors.signal.success : colors.signal.danger}>
              {commitment.currency} {commitment.pledge_amount.toLocaleString()}
            </TacticalText>
          </View>

          <View style={styles.dataRow}>
            <MicroLabel>DURATION</MicroLabel>
            <TacticalText>
              {readingDays} Days
            </TacticalText>
          </View>
        </View>

        {/* Memo Log */}
        <View style={styles.memoSection}>
          <View style={styles.memoHeader}>
            <MicroLabel style={{ color: colors.text.muted }}>FIELD NOTES</MicroLabel>
            <TouchableOpacity onPress={() => {
                setEditedMemo(verificationLog?.memo_text || '');
                setShowMemoModal(true);
            }}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.memoText}>
            {verificationLog?.memo_text || "No notes recorded."}
          </Text>
        </View>

        {/* Share Receipt Button */}
        {isSuccess && (
          <TouchableOpacity
            style={styles.shareReceiptButton}
            onPress={() => setShowReceiptModal(true)}
          >
            <Ionicons name="share-outline" size={20} color={colors.text.primary} />
            <Text style={styles.shareReceiptText}>
              Share Certificate
            </Text>
          </TouchableOpacity>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {renderTagEditModal()}
      {renderMemoEditModal()}

      {/* Receipt Preview Modal */}
      {isSuccess && (
        <ReceiptPreviewModal
          visible={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          bookTitle={book.title}
          bookAuthor={book.author || i18n.t('common.unknown_author')}
          bookCoverUrl={secureCoverUrl ?? undefined}
          completionDate={commitment.updated_at ? new Date(commitment.updated_at) : new Date()}
          readingDays={readingDays}
          savedAmount={commitment.pledge_amount}
          currency={commitment.currency}
        />
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorMessage: {
    color: colors.text.muted,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  safeHeader: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  heroContainer: {
    height: 420,
    width: '100%',
  },
  heroBg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  heroContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  posterContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 4,
  },
  posterPlaceholder: {
    width: 140,
    height: 210,
    borderRadius: 4,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24,
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  heroAuthor: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
  },
  tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      gap: 6,
  },
  tagDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
  },
  tagText: {
      fontSize: 12,
      color: colors.text.primary,
  },
  tagsSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: 24,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    borderStyle: 'dashed',
  },
  addTagText: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '500',
  },
  dataSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  memoSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  memoText: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },
  editLink: {
      color: colors.text.secondary,
      fontSize: 14,
  },
  memoInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    minHeight: 150,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveButton: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalBody: {
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  tagModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: colors.background.tertiary,
    gap: 8,
  },
  tagModalChipSelected: {
    backgroundColor: colors.text.primary,
  },
  tagModalChipText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  newTagSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: 24,
  },
  newTagTitle: {
      color: colors.text.secondary,
      marginBottom: 12,
  },
  newTagInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
  },
  createTagButton: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createTagButtonDisabled: {
    opacity: 0.5,
  },
  createTagButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  shareReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  shareReceiptText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
});
