/**
 * Open Library API utilities
 * Used as a fallback when Google Books API returns no results
 * https://openlibrary.org/dev/docs/api/search
 */

import { GoogleBook } from '../types/commitment.types';

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_publish_year?: number;
}

interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryBook[];
}

/**
 * Convert Open Library cover ID to URL
 * Size options: S (small), M (medium), L (large)
 */
function getCoverUrl(coverId: number | undefined): string | undefined {
  if (!coverId) return undefined;
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

/**
 * Convert Open Library book format to GoogleBook format
 * This allows reusing existing UI components without changes
 */
function convertToGoogleBook(book: OpenLibraryBook): GoogleBook {
  const coverUrl = getCoverUrl(book.cover_i);

  return {
    // Open Library key format: /works/OL12345W
    // Use the key as ID, replacing slashes to avoid issues
    id: `ol_${book.key.replace(/\//g, '_')}`,
    volumeInfo: {
      title: book.title,
      authors: book.author_name,
      pageCount: book.number_of_pages_median,
      imageLinks: coverUrl
        ? {
            thumbnail: coverUrl,
            smallThumbnail: coverUrl,
          }
        : undefined,
    },
  };
}

/**
 * Search Open Library API
 * Returns results in GoogleBook format for compatibility
 *
 * @param query - Search query string
 * @returns Array of books in GoogleBook format
 */
export async function searchOpenLibrary(query: string): Promise<GoogleBook[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=15`;

    if (__DEV__) {
      console.log('[OpenLibrary] Searching:', url);
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error('[OpenLibrary] HTTP error:', response.status);
      return [];
    }

    const data: OpenLibrarySearchResponse = await response.json();

    if (__DEV__) {
      console.log('[OpenLibrary] Results:', {
        numFound: data.numFound,
        docsCount: data.docs?.length ?? 0,
      });
    }

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    // Convert to GoogleBook format
    return data.docs.map(convertToGoogleBook);
  } catch (error) {
    console.error('[OpenLibrary] Search error:', error);
    return [];
  }
}
