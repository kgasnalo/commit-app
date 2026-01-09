import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { useNavigation, useRoute } from '@react-navigation/native';
import BookDetailSkeleton from '../components/BookDetailSkeleton';
import ReceiptPreviewModal from '../components/receipt/ReceiptPreviewModal';

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
  status: 'pending' | 'completed' | 'defaulted';
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
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

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

      // Load commitment with book and tags
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

      // Load verification log
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

      // Load all user tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (tagsError) throw tagsError;

      setAllTags(tagsData || []);
    } catch (err) {
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
        // Remove tag
        const bookTag = commitment.book_tags.find((bt) => bt.tags.id === tagId);
        if (!bookTag) return;

        const { error } = await supabase
          .from('book_tags')
          .delete()
          .eq('id', bookTag.id);

        if (error) throw error;
      } else {
        // Add tag
        const { error } = await supabase.from('book_tags').insert({
          commitment_id: commitment.id,
          tag_id: tagId,
        });

        if (error) throw error;
      }

      // Reload data
      await loadBookDetail();
    } catch (error) {
      console.error('Error toggling tag:', error);
    }
  }

  async function createNewTag() {
    if (!newTagName.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      // Add the new tag to the book
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

      // Update local state
      setVerificationLog({ ...verificationLog, memo_text: editedMemo });
      setShowMemoModal(false);
    } catch (error) {
      console.error('Error updating memo:', error);
      alert(i18n.t('bookDetail.memo_update_failed'));
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('library.edit_tags')}</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
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
                      <View
                        style={[styles.tagDot, { backgroundColor: tag.color }]}
                      />
                      <Text
                        style={[
                          styles.tagModalChipText,
                          isSelected && styles.tagModalChipTextSelected,
                        ]}
                      >
                        {tag.name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.newTagSection}>
                <Text style={styles.newTagTitle}>{i18n.t('library.new_tag')}</Text>
                <TextInput
                  style={styles.newTagInput}
                  placeholder={i18n.t('library.new_tag')}
                  placeholderTextColor="#666666"
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
                    {i18n.t('library.add_tag')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowTagModal(false)}
            >
              <Text style={styles.modalSaveButtonText}>{i18n.t('library.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('bookDetail.edit_memo_title')}</Text>
              <TouchableOpacity onPress={() => setShowMemoModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.memoInput}
              value={editedMemo}
              onChangeText={setEditedMemo}
              placeholder={i18n.t('bookDetail.memo_placeholder')}
              placeholderTextColor="#666666"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMemoModal(false)}
              >
                <Text style={styles.cancelButtonText}>{i18n.t('bookDetail.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={updateMemo}
              >
                <Text style={styles.saveButtonText}>{i18n.t('bookDetail.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (loading) {
    return <BookDetailSkeleton />;
  }

  if (error || !commitment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#666666" />
          <Text style={styles.errorTitle}>{i18n.t('bookDetail.error_title')}</Text>
          <Text style={styles.errorMessage}>
            {error || i18n.t('errors.unknown')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookDetail}>
            <Text style={styles.retryButtonText}>{i18n.t('bookDetail.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const book = commitment.books;
  const readingDays = calculateReadingDays();
  const isSuccess = commitment.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.bookCoverContainer}>
          <View style={styles.bookCover}>
            <Text style={styles.bookCoverText} numberOfLines={5}>
              {book.title}
            </Text>
          </View>
        </View>

        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>

        <View style={styles.tagsContainer}>
          {commitment.book_tags.map((bt) => (
            <View
              key={bt.id}
              style={[styles.tag, { backgroundColor: bt.tags.color }]}
            >
              <Text style={styles.tagText}>{bt.tags.name}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addTagChip}
            onPress={() => setShowTagModal(true)}
          >
            <Ionicons name="add" size={16} color="#FF4D00" />
            <Text style={styles.addTagChipText}>{i18n.t('library.add_tag')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{i18n.t('library.read_date')}</Text>
            <Text style={styles.detailValue}>
              {commitment.updated_at ? new Date(commitment.updated_at).toLocaleDateString() : '-'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{i18n.t('library.deadline')}</Text>
            <Text style={styles.detailValue}>
              {new Date(commitment.deadline).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{i18n.t('library.pledge_amount')}</Text>
            <Text
              style={[
                styles.detailValue,
                isSuccess ? styles.successText : styles.failText,
              ]}
            >
              {commitment.currency} {commitment.pledge_amount}{' '}
              ({isSuccess ? i18n.t('library.success') : i18n.t('dashboard.failed')})
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{i18n.t('library.reading_days')}</Text>
            <Text style={styles.detailValue}>
              {readingDays}
              {i18n.t('library.days')}
            </Text>
          </View>
        </View>

        {verificationLog && (
          <View style={styles.memoCard}>
            <View style={styles.memoHeader}>
              <View style={styles.memoTitleContainer}>
                <Ionicons name="document-text" size={20} color="#FF4D00" />
                <Text style={styles.memoTitle}>{i18n.t('library.memo')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditedMemo(verificationLog.memo_text || '');
                  setShowMemoModal(true);
                }}
              >
                <Text style={styles.editButton}>{i18n.t('library.edit')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.memoText}>{verificationLog.memo_text}</Text>
          </View>
        )}

        {/* Share Receipt Button - only for completed commitments */}
        {isSuccess && (
          <TouchableOpacity
            style={styles.shareReceiptButton}
            onPress={() => setShowReceiptModal(true)}
          >
            <Ionicons name="share-social" size={20} color="#FF4D00" />
            <Text style={styles.shareReceiptText}>
              {i18n.t('receipt.share_button')}
            </Text>
          </TouchableOpacity>
        )}
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
          bookCoverUrl={book.cover_url ?? undefined}
          completionDate={commitment.updated_at ? new Date(commitment.updated_at) : new Date()}
          readingDays={readingDays}
          savedAmount={commitment.pledge_amount}
          currency={commitment.currency}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#FF4D00',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  content: {
    flex: 1,
  },
  bookCoverContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  bookCover: {
    width: 150,
    height: 225,
    backgroundColor: '#FF4D00',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookCoverText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4D00',
    borderStyle: 'dashed',
  },
  addTagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4D00',
    marginLeft: 4,
  },
  detailsCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  detailLabel: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successText: {
    color: '#00C853',
  },
  failText: {
    color: '#EF4444',
  },
  memoCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4D00',
  },
  memoText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  memoInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 150,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF4D00',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  tagModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    gap: 6,
  },
  tagModalChipSelected: {
    backgroundColor: '#FF4D00',
  },
  tagModalChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  tagModalChipTextSelected: {
    fontWeight: '600',
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  newTagSection: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: 20,
  },
  newTagTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  newTagInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
    backgroundColor: '#FF4D00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createTagButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  createTagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSaveButton: {
    backgroundColor: '#FF4D00',
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4D00',
    backgroundColor: 'transparent',
  },
  shareReceiptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4D00',
  },
});
