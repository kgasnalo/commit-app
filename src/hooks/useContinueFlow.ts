import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  getBookProgress,
  getBookById,
  calculateSliderStartPage,
  calculateSuggestedDeadline,
} from '../lib/commitmentHelpers';
import i18n from '../i18n';
import { Currency, GoogleBook } from '../types/commitment.types';

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

interface UseContinueFlowParams {
  bookId: string | undefined;
  onBookSelect: (book: GoogleBook) => void;
  onBookTotalPages: (pages: number | null) => void;
  onPageCount: (count: number) => void;
  onCurrency: (currency: Currency) => void;
  onPledgeAmount: (amount: number | null) => void;
  onDeadline: (date: Date) => void;
}

interface UseContinueFlowReturn {
  isContinueFlow: boolean;
  loadingContinueData: boolean;
  totalPagesRead: number;
  continueInfoMessage: string | null;
  continueBookIdInternal: string | null;
}

export function useContinueFlow({
  bookId,
  onBookSelect,
  onBookTotalPages,
  onPageCount,
  onCurrency,
  onPledgeAmount,
  onDeadline,
}: UseContinueFlowParams): UseContinueFlowReturn {
  const [isContinueFlow, setIsContinueFlow] = useState(false);
  const [loadingContinueData, setLoadingContinueData] = useState(false);
  const [totalPagesRead, setTotalPagesRead] = useState(0);
  const [continueInfoMessage, setContinueInfoMessage] = useState<string | null>(null);
  const [continueBookIdInternal, setContinueBookIdInternal] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;

    let isMounted = true;

    async function initializeContinueFlow(id: string) {
      setLoadingContinueData(true);
      setIsContinueFlow(true);
      setContinueBookIdInternal(id);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const bookData = await getBookById(id);
        if (!bookData) throw new Error('Book not found');

        if (!isMounted) return;

        onBookTotalPages(bookData.total_pages);

        const googleBook: GoogleBook = {
          id: bookData.google_books_id ?? '',
          volumeInfo: {
            title: bookData.title,
            authors: [bookData.author],
            imageLinks: {
              thumbnail: bookData.cover_url ?? undefined,
            },
          },
        };
        onBookSelect(googleBook);

        const progress = await getBookProgress(id, user.id);
        if (!isMounted) return;

        setTotalPagesRead(progress.totalPagesRead);

        const maxPages = bookData.total_pages || 1000;
        const sliderStart = calculateSliderStartPage(progress.totalPagesRead, maxPages);
        onPageCount(sliderStart);

        if (progress.totalPagesRead >= maxPages - 50) {
          setContinueInfoMessage(
            i18n.t('commitment.progress_near_max', {
              pages: progress.totalPagesRead,
            })
          );
        }

        if (progress.lastCommitment) {
          // Pledge amount prefill removed for App Review compliance (Guideline 3.2.2)

          const suggestedDeadline = calculateSuggestedDeadline(
            progress.lastCommitment.deadline,
            progress.lastCommitment.created_at
          );
          onDeadline(suggestedDeadline);
        }
      } catch (error) {
        console.error('[ContinueFlow] Error:', error);
        if (isMounted) {
          Alert.alert(
            i18n.t('common.error'),
            i18n.t('errors.continue_flow_failed')
          );
          setIsContinueFlow(false);
          setContinueBookIdInternal(null);
        }
      } finally {
        if (isMounted) {
          setLoadingContinueData(false);
        }
      }
    }

    initializeContinueFlow(bookId);

    return () => { isMounted = false; };
  }, [bookId]);

  return {
    isContinueFlow,
    loadingContinueData,
    totalPagesRead,
    continueInfoMessage,
    continueBookIdInternal,
  };
}
