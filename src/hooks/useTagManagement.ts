import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { captureError } from '../utils/errorLogger';
import { Commitment, Tag } from './useBookCommitmentDetail';

interface UseTagManagementParams {
  commitment: Commitment | null;
  onRefresh: () => Promise<void>;
  tagColors: string[];
}

interface UseTagManagementReturn {
  showTagModal: boolean;
  setShowTagModal: (show: boolean) => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  toggleTag: (tagId: string) => Promise<void>;
  createNewTag: () => Promise<void>;
}

export function useTagManagement({
  commitment,
  onRefresh,
  tagColors,
}: UseTagManagementParams): UseTagManagementReturn {
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(tagColors[0]);

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
      await onRefresh();
    } catch (error) {
      captureError(error, { location: 'BookDetailScreen.toggleTag' });
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
      setSelectedColor(tagColors[0]);
      setShowTagModal(false);
      await onRefresh();
    } catch (error) {
      captureError(error, { location: 'BookDetailScreen.createNewTag' });
    }
  }

  return {
    showTagModal,
    setShowTagModal,
    newTagName,
    setNewTagName,
    selectedColor,
    setSelectedColor,
    toggleTag,
    createNewTag,
  };
}
