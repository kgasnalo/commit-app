import { supabase } from './supabase';
import { getNowDate } from './DateUtils';
import { captureError } from '../utils/errorLogger';

export interface BookProgress {
  totalPagesRead: number;
  lastCommitment: {
    id: string;
    deadline: string;
    pledge_amount: number;
    currency: string;
    target_pages: number;
    status: 'pending' | 'completed' | 'defaulted';
    created_at: string;
  } | null;
}

export interface CommitmentWithRange {
  id: string;
  book_id: string;
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  target_pages: number;
  created_at: string;
  startPage: number;
  endPage: number;
  commitmentIndex: number;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

export interface GroupedBookCommitments {
  bookId: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
  activeCount: number;
  mostRecentCommitment: CommitmentWithRange;
  allCommitments: CommitmentWithRange[];
  totalPledgeAmount: number;
  earliestDeadline: string;
  latestUpdated: string;
}

export interface RawCommitmentWithBook {
  id: string;
  book_id: string;
  deadline: string;
  status: 'pending' | 'completed' | 'defaulted';
  pledge_amount: number;
  currency: string;
  target_pages: number;
  created_at: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

export interface BookMetadata {
  id: string;
  google_books_id: string | null;
  title: string;
  author: string;
  cover_url: string | null;
  total_pages: number | null;
}

/**
 * Fetches the total reading progress for a specific book.
 * Sums target_pages from completed commitments only.
 * Also returns the most recent commitment for pre-filling settings.
 */
export async function getBookProgress(bookId: string, userId: string): Promise<BookProgress> {
  try {
    const { data: commitments, error } = await supabase
      .from('commitments')
      .select('id, deadline, pledge_amount, currency, target_pages, status, created_at')
      .eq('book_id', bookId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!commitments || commitments.length === 0) {
      return {
        totalPagesRead: 0,
        lastCommitment: null,
      };
    }

    // Sum target_pages from completed and pending commitments (exclude defaulted)
    const activeCommitments = commitments.filter(
      c => c.status === 'completed' || c.status === 'pending'
    );
    const totalPagesRead = activeCommitments.reduce(
      (sum, c) => sum + (c.target_pages || 0),
      0
    );

    return {
      totalPagesRead,
      lastCommitment: commitments[0] as BookProgress['lastCommitment'],
    };
  } catch (error) {
    captureError(error, {
      location: 'getBookProgress',
      extra: { bookId, userId },
    });
    return {
      totalPagesRead: 0,
      lastCommitment: null,
    };
  }
}

/**
 * Fetches book metadata by book ID (internal Supabase ID).
 */
export async function getBookById(bookId: string): Promise<BookMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, google_books_id, title, author, cover_url, total_pages')
      .eq('id', bookId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    captureError(error, {
      location: 'getBookById',
      extra: { bookId },
    });
    return null;
  }
}

/**
 * Calculates the suggested starting page for a new commitment.
 * Clamps to max 950 to leave room for at least 50 pages.
 */
export function calculateSliderStartPage(totalPagesRead: number, maxPages: number = 1000): number {
  const suggestedStart = totalPagesRead + 1;

  if (suggestedStart >= maxPages - 50) {
    return maxPages - 50;
  }

  return Math.min(suggestedStart, maxPages);
}

/**
 * Calculates a suggested deadline based on the previous commitment's duration.
 * Duration is clamped between 1 day and 30 days.
 */
export function calculateSuggestedDeadline(lastDeadline: string, lastCreatedAt: string): Date {
  const created = new Date(lastCreatedAt);
  const deadline = new Date(lastDeadline);
  const durationMs = deadline.getTime() - created.getTime();

  const minDuration = 1 * 24 * 60 * 60 * 1000; // 1 day
  const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
  const clampedDuration = Math.min(Math.max(durationMs, minDuration), maxDuration);

  return new Date(getNowDate().getTime() + clampedDuration);
}

/**
 * Calculates page ranges for all commitments.
 * Groups by book_id, sorts by created_at, and calculates cumulative pages.
 * Only completed + pending commitments contribute to page calculation (defaulted excluded).
 */
export function calculatePageRangesForAll(
  commitments: RawCommitmentWithBook[]
): CommitmentWithRange[] {
  // Group commitments by book_id
  const byBook = new Map<string, RawCommitmentWithBook[]>();
  for (const c of commitments) {
    const list = byBook.get(c.book_id) || [];
    list.push(c);
    byBook.set(c.book_id, list);
  }

  const result: CommitmentWithRange[] = [];

  for (const [bookId, bookCommitments] of byBook) {
    // Sort by created_at ascending for cumulative calculation
    const sorted = [...bookCommitments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let cumulativePages = 0;
    let commitmentIndex = 0;

    for (const c of sorted) {
      // Only count completed + pending for page calculation
      const includeInPageCalc = c.status === 'completed' || c.status === 'pending';

      if (includeInPageCalc) {
        commitmentIndex++;
      }

      const startPage = includeInPageCalc ? cumulativePages + 1 : 0;
      const endPage = includeInPageCalc ? cumulativePages + (c.target_pages || 0) : 0;

      result.push({
        ...c,
        startPage,
        endPage,
        commitmentIndex: includeInPageCalc ? commitmentIndex : 0,
      });

      if (includeInPageCalc) {
        cumulativePages += c.target_pages || 0;
      }
    }
  }

  return result;
}

/**
 * Groups commitments by book.
 * Returns sorted by latestUpdated descending (most recently updated first).
 * Prioritizes PENDING commitments as the "most recent" representation for the card.
 */
export function groupCommitmentsByBook(
  commitments: CommitmentWithRange[]
): GroupedBookCommitments[] {
  const grouped = new Map<string, GroupedBookCommitments>();

  for (const c of commitments) {
    if (!grouped.has(c.book_id)) {
      grouped.set(c.book_id, {
        bookId: c.book_id,
        book: c.book,
        activeCount: 0,
        mostRecentCommitment: c,
        allCommitments: [],
        totalPledgeAmount: 0,
        earliestDeadline: c.deadline,
        latestUpdated: c.created_at,
      });
    }

    const group = grouped.get(c.book_id)!;
    group.allCommitments.push(c);

    if (c.status === 'pending') {
      group.activeCount++;
      group.totalPledgeAmount += c.pledge_amount || 0;

      // Track earliest deadline among pending
      if (new Date(c.deadline) < new Date(group.earliestDeadline)) {
        group.earliestDeadline = c.deadline;
      }
    }

    // Default: update most recent by creation date
    // This establishes a baseline "latest" (likely the completed one if a new pending hasn't been created yet, or the new pending if it has)
    if (new Date(c.created_at) > new Date(group.latestUpdated)) {
      group.latestUpdated = c.created_at;
      group.mostRecentCommitment = c;
    }
  }

  // Final Pass: Explicitly prioritize PENDING commitments
  // If a group has any pending commitment, force mostRecentCommitment to be the (newest) pending one.
  // This fixes the bug where a completed commitment hides a newer (or older) active one.
  for (const group of grouped.values()) {
    const pendingCommitments = group.allCommitments.filter(c => c.status === 'pending');
    if (pendingCommitments.length > 0) {
      // Sort by created_at desc (newest first)
      pendingCommitments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      group.mostRecentCommitment = pendingCommitments[0];
    }
  }

  // Sort by latestUpdated descending (most recently updated first)
  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.latestUpdated).getTime() - new Date(a.latestUpdated).getTime()
  );
}
