/**
 * Search Query Builder for Google Books API
 * Intelligently constructs queries based on input type (ISBN, title+author, plain text)
 */

import { normalizeISBN, isValidISBN } from './isbn';

export interface SearchParams {
  /** User's raw search input */
  query: string;
  /** Explicit title (from advanced search) */
  title?: string;
  /** Explicit author (from advanced search) */
  author?: string;
}

export interface ParsedQuery {
  /** Type of query detected */
  type: 'isbn' | 'combined' | 'text';
  /** Formatted query string for Google Books API */
  googleBooksQuery: string;
  /** Normalized ISBN value (if type is 'isbn') */
  isbnValue?: string;
}

/**
 * Detect if the input looks like an ISBN
 * Handles formats with or without hyphens
 */
export function detectISBN(input: string): string | null {
  // Remove common noise characters
  const cleaned = input.trim().replace(/[-\s]/g, '');

  // Check if it's a valid ISBN
  if (isValidISBN(cleaned)) {
    return normalizeISBN(cleaned);
  }

  // Also detect ISBN-like patterns that might be missing a digit
  // (user might have typed it wrong)
  if (/^(978|979)?\d{9,13}$/.test(cleaned)) {
    // Looks ISBN-like, try normalizing
    const normalized = normalizeISBN(cleaned);
    if (isValidISBN(normalized)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Build an optimized search query for Google Books API
 *
 * Priority:
 * 1. ISBN detection -> Use isbn: operator for exact match
 * 2. Title + Author provided -> Use intitle: + inauthor: operators
 * 3. Plain text fallback -> Standard search
 */
export function buildSearchQuery(params: SearchParams): ParsedQuery {
  const { query, title, author } = params;

  // Priority 1: Check for ISBN in the query
  const detectedISBN = detectISBN(query);
  if (detectedISBN) {
    return {
      type: 'isbn',
      googleBooksQuery: `isbn:${detectedISBN}`,
      isbnValue: detectedISBN,
    };
  }

  // Priority 2: Combined title + author search (advanced mode)
  if (title?.trim() && author?.trim()) {
    const titleQuery = `intitle:${title.trim()}`;
    const authorQuery = `inauthor:${author.trim()}`;
    return {
      type: 'combined',
      googleBooksQuery: `${titleQuery}+${authorQuery}`,
    };
  }

  // Priority 2b: Title only with intitle operator for better precision
  if (title?.trim()) {
    return {
      type: 'combined',
      googleBooksQuery: `intitle:${title.trim()}`,
    };
  }

  // Priority 2c: Author only with inauthor operator
  if (author?.trim()) {
    return {
      type: 'combined',
      googleBooksQuery: `inauthor:${author.trim()}`,
    };
  }

  // Priority 3: Plain text fallback
  // Check if the query contains both title-like and author-like parts
  // e.g., "水滸伝 北方謙三" -> Try to split into title + author
  const parts = query.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Heuristic: If the query has multiple parts, try as title + author
    // This helps for Japanese book searches like "書名 著者名"
    const possibleTitle = parts.slice(0, -1).join(' ');
    const possibleAuthor = parts[parts.length - 1];

    // If the last part looks like a name (2-4 characters in Japanese)
    // or ends with common author suffixes, treat it as author
    const looksLikeJapaneseName = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]{2,6}$/.test(possibleAuthor);

    if (looksLikeJapaneseName) {
      return {
        type: 'combined',
        googleBooksQuery: `intitle:${possibleTitle}+inauthor:${possibleAuthor}`,
      };
    }
  }

  // Final fallback: Plain text search
  return {
    type: 'text',
    googleBooksQuery: query.trim(),
  };
}

/**
 * Check if query string is likely an ISBN (for UI hints)
 */
export function isLikelyISBN(query: string): boolean {
  const cleaned = query.trim().replace(/[-\s]/g, '');
  // Looks like ISBN if it's mostly digits and 10-13 characters
  return /^\d{10,13}$/.test(cleaned) || /^(978|979)\d{7,10}$/.test(cleaned);
}
