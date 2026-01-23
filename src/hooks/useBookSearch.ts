import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { GOOGLE_API_KEY } from '../config/env';
import { buildSearchQuery } from '../utils/searchQueryBuilder';
import { filterAndRankResults, GoogleBook as GoogleBookFilter } from '../utils/searchResultFilter';
import i18n from '../i18n';
import { GoogleBook } from '../types/commitment.types';

interface UseBookSearchParams {
  onBookSelect: (book: GoogleBook) => void;
}

interface UseBookSearchReturn {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: GoogleBook[];
  setSearchResults: (r: GoogleBook[]) => void;
  searching: boolean;
  searchBooks: () => Promise<void>;
  handleBookSelect: (book: GoogleBook) => void;
}

export function useBookSearch({ onBookSelect }: UseBookSearchParams): UseBookSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [searching, setSearching] = useState(false);

  const handleBookSelect = (book: GoogleBook) => {
    onBookSelect(book);
    setSearchResults([]);
    setSearchQuery('');
  };

  const searchBooks = async () => {
    if (!searchQuery.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.search_keyword_required'));
      return;
    }

    if (!GOOGLE_API_KEY) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.google_api_not_configured'));
      return;
    }

    setSearching(true);
    try {
      const parsedQuery = buildSearchQuery({ query: searchQuery });

      // If ISBN detected, try direct lookup first
      if (parsedQuery.type === 'isbn' && parsedQuery.isbnValue) {
        const { data: isbnData } = await supabase.functions.invoke('isbn-lookup', {
          body: { isbn: parsedQuery.isbnValue },
        });
        if (isbnData?.success && isbnData.book) {
          const googleBook: GoogleBook = {
            id: isbnData.book.id,
            volumeInfo: {
              title: isbnData.book.title,
              authors: isbnData.book.authors,
              imageLinks: isbnData.book.thumbnail
                ? { thumbnail: isbnData.book.thumbnail }
                : undefined,
            },
          };
          handleBookSelect(googleBook);
          setSearching(false);
          return;
        }
      }

      // Standard Google Books search with optimized query
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parsedQuery.googleBooksQuery)}&key=${GOOGLE_API_KEY}&maxResults=15`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const filteredResults = filterAndRankResults(data.items as GoogleBookFilter[]);
        setSearchResults(filteredResults as GoogleBook[]);

        if (filteredResults.length === 0) {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (error: unknown) {
      Alert.alert(i18n.t('common.error'), i18n.t('errors.search_failed'));
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searching,
    searchBooks,
    handleBookSelect,
  };
}
