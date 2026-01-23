import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { captureError } from '../utils/errorLogger';
import { VerificationLog } from './useBookCommitmentDetail';

interface UseMemoEditorParams {
  verificationLog: VerificationLog | null;
  setVerificationLog: React.Dispatch<React.SetStateAction<VerificationLog | null>>;
}

interface UseMemoEditorReturn {
  showMemoModal: boolean;
  setShowMemoModal: (show: boolean) => void;
  editedMemo: string;
  setEditedMemo: (memo: string) => void;
  updateMemo: () => Promise<void>;
}

export function useMemoEditor({
  verificationLog,
  setVerificationLog,
}: UseMemoEditorParams): UseMemoEditorReturn {
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [editedMemo, setEditedMemo] = useState('');

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
      Alert.alert(i18n.t('common.error'), i18n.t('bookDetail.memo_update_failed'));
    }
  }

  return {
    showMemoModal,
    setShowMemoModal,
    editedMemo,
    setEditedMemo,
    updateMemo,
  };
}
