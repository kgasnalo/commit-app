/**
 * Unit tests for commitmentHelpers
 * Tests pure functions for page range calculation and deadline suggestions
 */

import {
  calculateSliderStartPage,
  calculateSuggestedDeadline,
  calculatePageRangesForAll,
  groupCommitmentsByBook,
  RawCommitmentWithBook,
} from '../lib/commitmentHelpers';

describe('calculateSliderStartPage', () => {
  it('should return 1 when no pages have been read', () => {
    expect(calculateSliderStartPage(0)).toBe(1);
  });

  it('should return next page after total pages read', () => {
    expect(calculateSliderStartPage(50)).toBe(51);
    expect(calculateSliderStartPage(100)).toBe(101);
    expect(calculateSliderStartPage(499)).toBe(500);
  });

  it('should clamp to max - 50 when approaching max pages', () => {
    expect(calculateSliderStartPage(960, 1000)).toBe(950);
    expect(calculateSliderStartPage(999, 1000)).toBe(950);
    expect(calculateSliderStartPage(1050, 1000)).toBe(950);
  });

  it('should respect custom max pages', () => {
    expect(calculateSliderStartPage(450, 500)).toBe(450);
    expect(calculateSliderStartPage(460, 500)).toBe(450);
  });
});

describe('calculateSuggestedDeadline', () => {
  const now = new Date();

  it('should calculate deadline based on previous commitment duration', () => {
    const created = new Date(now);
    created.setDate(created.getDate() - 7);
    const deadline = new Date(now);

    const suggested = calculateSuggestedDeadline(
      deadline.toISOString(),
      created.toISOString()
    );

    // Should be approximately 7 days from now
    const diffDays = Math.round(
      (suggested.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
  });

  it('should clamp minimum duration to 1 day', () => {
    const created = new Date(now);
    const deadline = new Date(now);
    deadline.setHours(deadline.getHours() + 1); // 1 hour duration

    const suggested = calculateSuggestedDeadline(
      deadline.toISOString(),
      created.toISOString()
    );

    // Should be at least 1 day from now
    const diffMs = suggested.getTime() - Date.now();
    const minDurationMs = 1 * 24 * 60 * 60 * 1000;
    expect(diffMs).toBeGreaterThanOrEqual(minDurationMs - 1000); // Allow 1s tolerance
  });

  it('should clamp maximum duration to 30 days', () => {
    const created = new Date(now);
    created.setDate(created.getDate() - 60);
    const deadline = new Date(now);

    const suggested = calculateSuggestedDeadline(
      deadline.toISOString(),
      created.toISOString()
    );

    // Should be at most 30 days from now
    const diffMs = suggested.getTime() - Date.now();
    const maxDurationMs = 30 * 24 * 60 * 60 * 1000;
    expect(diffMs).toBeLessThanOrEqual(maxDurationMs + 1000); // Allow 1s tolerance
  });
});

describe('calculatePageRangesForAll', () => {
  const mockBook = {
    id: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    cover_url: null,
  };

  it('should return empty array for empty input', () => {
    expect(calculatePageRangesForAll([])).toEqual([]);
  });

  it('should calculate page ranges for single commitment', () => {
    const commitments: RawCommitmentWithBook[] = [
      {
        id: 'c1',
        book_id: 'book-1',
        deadline: '2025-01-20T00:00:00Z',
        status: 'pending',
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 50,
        created_at: '2025-01-01T00:00:00Z',
        book: mockBook,
      },
    ];

    const result = calculatePageRangesForAll(commitments);
    expect(result).toHaveLength(1);
    expect(result[0].startPage).toBe(1);
    expect(result[0].endPage).toBe(50);
    expect(result[0].commitmentIndex).toBe(1);
  });

  it('should calculate cumulative page ranges for multiple commitments', () => {
    const commitments: RawCommitmentWithBook[] = [
      {
        id: 'c1',
        book_id: 'book-1',
        deadline: '2025-01-10T00:00:00Z',
        status: 'completed',
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 50,
        created_at: '2025-01-01T00:00:00Z',
        book: mockBook,
      },
      {
        id: 'c2',
        book_id: 'book-1',
        deadline: '2025-01-20T00:00:00Z',
        status: 'pending',
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 30,
        created_at: '2025-01-11T00:00:00Z',
        book: mockBook,
      },
    ];

    const result = calculatePageRangesForAll(commitments);
    expect(result).toHaveLength(2);

    // First commitment: pages 1-50
    const first = result.find((c) => c.id === 'c1');
    expect(first?.startPage).toBe(1);
    expect(first?.endPage).toBe(50);

    // Second commitment: pages 51-80
    const second = result.find((c) => c.id === 'c2');
    expect(second?.startPage).toBe(51);
    expect(second?.endPage).toBe(80);
  });

  it('should exclude defaulted commitments from page calculation', () => {
    const commitments: RawCommitmentWithBook[] = [
      {
        id: 'c1',
        book_id: 'book-1',
        deadline: '2025-01-10T00:00:00Z',
        status: 'completed',
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 50,
        created_at: '2025-01-01T00:00:00Z',
        book: mockBook,
      },
      {
        id: 'c2',
        book_id: 'book-1',
        deadline: '2025-01-15T00:00:00Z',
        status: 'defaulted',
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 30,
        created_at: '2025-01-11T00:00:00Z',
        book: mockBook,
      },
      {
        id: 'c3',
        book_id: 'book-1',
        deadline: '2025-01-25T00:00:00Z',
        status: 'pending',
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 40,
        created_at: '2025-01-16T00:00:00Z',
        book: mockBook,
      },
    ];

    const result = calculatePageRangesForAll(commitments);
    expect(result).toHaveLength(3);

    // Defaulted commitment should have 0 page range
    const defaulted = result.find((c) => c.id === 'c2');
    expect(defaulted?.startPage).toBe(0);
    expect(defaulted?.endPage).toBe(0);
    expect(defaulted?.commitmentIndex).toBe(0);

    // Third commitment continues from first (skips defaulted)
    const third = result.find((c) => c.id === 'c3');
    expect(third?.startPage).toBe(51);
    expect(third?.endPage).toBe(90);
  });
});

describe('groupCommitmentsByBook', () => {
  const mockBook1 = {
    id: 'book-1',
    title: 'Book One',
    author: 'Author One',
    cover_url: null,
  };

  const mockBook2 = {
    id: 'book-2',
    title: 'Book Two',
    author: 'Author Two',
    cover_url: null,
  };

  it('should return empty array for empty input', () => {
    expect(groupCommitmentsByBook([])).toEqual([]);
  });

  it('should group commitments by book', () => {
    const commitments = [
      {
        id: 'c1',
        book_id: 'book-1',
        deadline: '2025-01-20T00:00:00Z',
        status: 'pending' as const,
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 50,
        created_at: '2025-01-01T00:00:00Z',
        book: mockBook1,
        startPage: 1,
        endPage: 50,
        commitmentIndex: 1,
      },
      {
        id: 'c2',
        book_id: 'book-2',
        deadline: '2025-01-25T00:00:00Z',
        status: 'pending' as const,
        pledge_amount: 500,
        currency: 'JPY',
        target_pages: 30,
        created_at: '2025-01-02T00:00:00Z',
        book: mockBook2,
        startPage: 1,
        endPage: 30,
        commitmentIndex: 1,
      },
    ];

    const result = groupCommitmentsByBook(commitments);
    expect(result).toHaveLength(2);

    const book1Group = result.find((g) => g.bookId === 'book-1');
    expect(book1Group?.activeCount).toBe(1);
    expect(book1Group?.totalPledgeAmount).toBe(1000);

    const book2Group = result.find((g) => g.bookId === 'book-2');
    expect(book2Group?.activeCount).toBe(1);
    expect(book2Group?.totalPledgeAmount).toBe(500);
  });

  it('should prioritize pending commitments as mostRecentCommitment', () => {
    const commitments = [
      {
        id: 'c1',
        book_id: 'book-1',
        deadline: '2025-01-10T00:00:00Z',
        status: 'completed' as const,
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 50,
        created_at: '2025-01-01T00:00:00Z',
        book: mockBook1,
        startPage: 1,
        endPage: 50,
        commitmentIndex: 1,
      },
      {
        id: 'c2',
        book_id: 'book-1',
        deadline: '2025-01-20T00:00:00Z',
        status: 'pending' as const,
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 30,
        created_at: '2025-01-11T00:00:00Z',
        book: mockBook1,
        startPage: 51,
        endPage: 80,
        commitmentIndex: 2,
      },
    ];

    const result = groupCommitmentsByBook(commitments);
    expect(result).toHaveLength(1);

    const group = result[0];
    expect(group.mostRecentCommitment.id).toBe('c2'); // Pending prioritized
    expect(group.mostRecentCommitment.status).toBe('pending');
    expect(group.activeCount).toBe(1);
    expect(group.allCommitments).toHaveLength(2);
  });

  it('should track earliest deadline among pending commitments', () => {
    const commitments = [
      {
        id: 'c1',
        book_id: 'book-1',
        deadline: '2025-01-25T00:00:00Z',
        status: 'pending' as const,
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 50,
        created_at: '2025-01-01T00:00:00Z',
        book: mockBook1,
        startPage: 1,
        endPage: 50,
        commitmentIndex: 1,
      },
      {
        id: 'c2',
        book_id: 'book-1',
        deadline: '2025-01-15T00:00:00Z', // Earlier deadline
        status: 'pending' as const,
        pledge_amount: 1000,
        currency: 'JPY',
        target_pages: 30,
        created_at: '2025-01-02T00:00:00Z',
        book: mockBook1,
        startPage: 51,
        endPage: 80,
        commitmentIndex: 2,
      },
    ];

    const result = groupCommitmentsByBook(commitments);
    expect(result[0].earliestDeadline).toBe('2025-01-15T00:00:00Z');
  });
});
