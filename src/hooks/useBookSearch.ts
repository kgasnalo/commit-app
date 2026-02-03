import { useState } from 'react';
import { Alert } from 'react-native';
import { GOOGLE_API_KEY } from '../config/env';
import { buildSearchQuery } from '../utils/searchQueryBuilder';
import { filterAndRankResults, GoogleBook as GoogleBookFilter } from '../utils/searchResultFilter';
import { searchOpenLibrary } from '../utils/openLibraryApi';
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
    if (__DEV__) {
      console.log('[BookSearch] searchBooks called, query:', searchQuery);
      console.log('[BookSearch] GOOGLE_API_KEY exists:', !!GOOGLE_API_KEY, 'length:', GOOGLE_API_KEY?.length ?? 0);
    }

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
      if (__DEV__) {
        console.log('[BookSearch] Parsed query:', parsedQuery);
      }

      // If ISBN detected, try direct lookup first (client-side, same API key as standard search)
      if (parsedQuery.type === 'isbn' && parsedQuery.isbnValue) {
        const isbnResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${parsedQuery.isbnValue}&key=${GOOGLE_API_KEY}&maxResults=1`
        );
        const isbnData = await isbnResponse.json();
        if (isbnData.items && isbnData.items.length > 0) {
          handleBookSelect(isbnData.items[0] as GoogleBook);
          setSearching(false);
          return;
        }
      }

      // Standard Google Books search with optimized query
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parsedQuery.googleBooksQuery)}&key=${GOOGLE_API_KEY}&maxResults=15`
      );
      const data = await response.json();

      // Debug: Log API response
      if (__DEV__) {
        console.log('[BookSearch] API response:', {
          query: parsedQuery.googleBooksQuery,
          totalItems: data.totalItems,
          itemsCount: data.items?.length ?? 0,
          error: data.error,
        });
      }

      // Handle API errors (quota exceeded, etc.)
      if (data.error) {
        console.error('[BookSearch] API error:', data.error);

        // Detect quota exceeded error
        const isQuotaExceeded =
          data.error.code === 429 ||
          data.error.status === 'RESOURCE_EXHAUSTED' ||
          data.error.message?.includes('Quota exceeded');

        if (isQuotaExceeded) {
          Alert.alert(
            i18n.t('common.error'),
            i18n.t('errors.api_quota_exceeded')
          );
          setSearchResults([]);
          return;
        }

        // For other errors (including regional restrictions), try Open Library
        if (__DEV__) {
          console.log('[BookSearch] Google Books error, trying Open Library fallback...');
        }
        const openLibraryResults = await searchOpenLibrary(searchQuery);
        if (openLibraryResults.length > 0) {
          setSearchResults(openLibraryResults);
          return;
        }

        // If Open Library also fails, show error
        Alert.alert(
          i18n.t('common.error'),
          data.error.message || i18n.t('errors.search_failed')
        );
        setSearchResults([]);
        return;
      }

      if (data.items && data.items.length > 0) {
        const filteredResults = filterAndRankResults(data.items as GoogleBookFilter[]);

        if (filteredResults.length > 0) {
          setSearchResults(filteredResults as GoogleBook[]);
        } else {
          // Filtered results are empty, try Open Library
          if (__DEV__) {
            console.log('[BookSearch] Google Books filtered to 0, trying Open Library...');
          }
          const openLibraryResults = await searchOpenLibrary(searchQuery);
          setSearchResults(openLibraryResults);
        }
      } else {
        // Google Books returned 0 results, try Open Library as fallback
        if (__DEV__) {
          console.log('[BookSearch] Google Books returned 0 results, trying Open Library...');
        }
        const openLibraryResults = await searchOpenLibrary(searchQuery);
        setSearchResults(openLibraryResults);
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
