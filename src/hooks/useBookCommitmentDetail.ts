import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { captureError } from '../utils/errorLogger';

export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface BookTag {
  id: string;
  tag_id: string;
  tags: Tag;
}

export interface Commitment {
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

export interface VerificationLog {
  id: string;
  commitment_id: string;
  memo_text: string | null;
  created_at: string;
}

interface UseBookCommitmentDetailReturn {
  commitment: Commitment | null;
  verificationLog: VerificationLog | null;
  setVerificationLog: React.Dispatch<React.SetStateAction<VerificationLog | null>>;
  allTags: Tag[];
  loading: boolean;
  error: string | null;
  loadBookDetail: () => Promise<void>;
}

export function useBookCommitmentDetail(commitmentId: string): UseBookCommitmentDetailReturn {
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [verificationLog, setVerificationLog] = useState<VerificationLog | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .maybeSingle();

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
      setError(i18n.t('bookDetail.error_message'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookDetail();
  }, [commitmentId]);

  return {
    commitment,
    verificationLog,
    setVerificationLog,
    allTags,
    loading,
    error,
    loadBookDetail,
  };
}
