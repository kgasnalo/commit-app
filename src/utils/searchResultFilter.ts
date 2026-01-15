/**
 * Search Result Filter and Ranking for Google Books API results
 * Filters low-quality results and ranks by data completeness
 */

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
    publishedDate?: string;
  };
}

interface RankedBook extends GoogleBook {
  score: number;
}

/**
 * Score weights for ranking
 */
const SCORE_WEIGHTS = {
  HAS_COVER: 30,
  HAS_PAGE_COUNT: 20,
  HAS_AUTHOR: 15,
  HAS_PUBLISHED_DATE: 5,
  TITLE_LENGTH_MAX: 5,
} as const;

/**
 * Filter and rank search results from Google Books API
 *
 * @param results - Raw results from Google Books API
 * @returns Filtered, ranked, and deduplicated results
 */
export function filterAndRankResults(results: GoogleBook[]): GoogleBook[] {
  if (!results || results.length === 0) {
    return [];
  }

  // 1. Filter out invalid results
  const validResults = results.filter((book) => {
    // Must have title
    if (!book.volumeInfo?.title) return false;

    // Skip if title is too short (likely invalid or placeholder)
    if (book.volumeInfo.title.length < 2) return false;

    // Skip entries that look like collections/compilations without specific title
    const title = book.volumeInfo.title.toLowerCase();
    if (title === 'untitled' || title === '無題') return false;

    return true;
  });

  // 2. Score each result based on data quality
  const rankedResults: RankedBook[] = validResults.map((book) => {
    let score = 0;

    // Has cover image: +30 points (most important for UX)
    if (
      book.volumeInfo.imageLinks?.thumbnail ||
      book.volumeInfo.imageLinks?.smallThumbnail
    ) {
      score += SCORE_WEIGHTS.HAS_COVER;
    }

    // Has page count: +20 points (important for commitment tracking)
    if (book.volumeInfo.pageCount && book.volumeInfo.pageCount > 0) {
      score += SCORE_WEIGHTS.HAS_PAGE_COUNT;
    }

    // Has author info: +15 points
    if (book.volumeInfo.authors && book.volumeInfo.authors.length > 0) {
      score += SCORE_WEIGHTS.HAS_AUTHOR;
    }

    // Has published date: +5 points
    if (book.volumeInfo.publishedDate) {
      score += SCORE_WEIGHTS.HAS_PUBLISHED_DATE;
    }

    // Title length bonus (longer = more specific): +5 points max
    // Helps prefer specific editions over generic entries
    const titleLength = book.volumeInfo.title.length;
    score += Math.min(SCORE_WEIGHTS.TITLE_LENGTH_MAX, Math.floor(titleLength / 10));

    return { ...book, score };
  });

  // 3. Sort by score (descending), maintain original order for equal scores
  rankedResults.sort((a, b) => b.score - a.score);

  // 4. Deduplicate by normalized title + author
  const seen = new Set<string>();
  const deduped = rankedResults.filter((book) => {
    const normalizedTitle = normalizeForDedup(book.volumeInfo.title);
    const normalizedAuthor = (book.volumeInfo.authors || [])
      .map(normalizeForDedup)
      .sort()
      .join(',');
    const key = `${normalizedTitle}|${normalizedAuthor}`;

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  // Remove the score property before returning
  return deduped.map(({ score, ...book }) => book);
}

/**
 * Normalize string for deduplication comparison
 * Removes punctuation, extra spaces, and lowercases
 */
function normalizeForDedup(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a book has complete data (for display quality indicators)
 */
export function isCompleteBook(book: GoogleBook): boolean {
  return !!(
    book.volumeInfo.title &&
    book.volumeInfo.authors?.length &&
    (book.volumeInfo.imageLinks?.thumbnail ||
      book.volumeInfo.imageLinks?.smallThumbnail) &&
    book.volumeInfo.pageCount
  );
}

/**
 * Get a quality score for displaying to users (0-100)
 */
export function getBookQualityScore(book: GoogleBook): number {
  let score = 0;

  if (book.volumeInfo.title) score += 25;
  if (book.volumeInfo.authors?.length) score += 25;
  if (book.volumeInfo.imageLinks?.thumbnail) score += 30;
  if (book.volumeInfo.pageCount) score += 20;

  return Math.min(100, score);
}
