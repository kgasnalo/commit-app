import { useState, useEffect } from 'react';
import { GoogleBook, ManualBook } from '../types/commitment.types';

interface UseManualBookEntryParams {
  manualBook: ManualBook | undefined;
  onBookSelect: (book: GoogleBook) => void;
  onPageCount: (count: number) => void;
}

interface UseManualBookEntryReturn {
  isManualEntry: boolean;
  manualBookData: ManualBook | null;
  manualMaxPages: number;
}

export function useManualBookEntry({
  manualBook,
  onBookSelect,
  onPageCount,
}: UseManualBookEntryParams): UseManualBookEntryReturn {
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualBookData, setManualBookData] = useState<ManualBook | null>(manualBook || null);
  const [manualMaxPages, setManualMaxPages] = useState<number>(1000);

  useEffect(() => {
    if (!manualBook) return;

    setIsManualEntry(true);
    setManualBookData(manualBook);
    setManualMaxPages(manualBook.totalPages);

    const googleBook: GoogleBook = {
      id: `manual_${Date.now()}`,
      volumeInfo: {
        title: manualBook.title,
        authors: [manualBook.author],
        imageLinks: manualBook.coverUrl
          ? { thumbnail: manualBook.coverUrl }
          : undefined,
      },
    };
    onBookSelect(googleBook);

    onPageCount(Math.min(Math.ceil(manualBook.totalPages / 2), manualBook.totalPages));
  }, [manualBook]);

  return {
    isManualEntry,
    manualBookData,
    manualMaxPages,
  };
}
