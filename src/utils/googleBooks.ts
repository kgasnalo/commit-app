// Google Books API utilities

interface GoogleBooksVolume {
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
}

/**
 * Ensure URL uses HTTPS protocol (iOS ATS requirement)
 * Database may contain old HTTP URLs that need conversion
 * Also sanitizes Google Books URLs by removing 'edge=curl' which can break rendering
 */
export function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  let secureUrl = url.replace(/^http:\/\//i, 'https://');
  
  // Remove edge=curl parameter which often causes rendering issues or blank images
  // Example: &edge=curl -> (empty string)
  secureUrl = secureUrl.replace(/&edge=curl/g, '');
  
  return secureUrl;
}

/**
 * Fetch book cover from Open Library API (fallback)
 * Uses search by title and author
 */
async function fetchOpenLibraryCover(
  title: string,
  author?: string
): Promise<string | null> {
  try {
    // Build search query
    let query = `title=${encodeURIComponent(title)}`;
    if (author) {
      query += `&author=${encodeURIComponent(author)}`;
    }

    const url = `https://openlibrary.org/search.json?${query}&limit=1`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('Open Library API request failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      console.log('No books found in Open Library for:', title);
      return null;
    }

    const book = data.docs[0];

    // Open Library uses cover_i (cover ID) to build cover URL
    if (book.cover_i) {
      // Use medium size (M) for good quality
      return `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
    }

    // Alternative: use ISBN if available
    if (book.isbn && book.isbn.length > 0) {
      return `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-M.jpg`;
    }

    console.log('No cover found in Open Library for:', title);
    return null;
  } catch (error) {
    console.error('Error fetching cover from Open Library:', error);
    return null;
  }
}

/**
 * Fetch book cover image URL from Google Books API
 * Falls back to Open Library if Google Books doesn't have a cover
 * @param title - Book title
 * @param author - Book author (optional)
 * @returns Cover image URL or null if not found
 */
export async function fetchBookCover(
  title: string,
  author?: string
): Promise<string | null> {
  // Try Google Books first
  const googleCover = await fetchGoogleBooksCover(title, author);
  if (googleCover) {
    return googleCover;
  }

  // Fallback to Open Library
  console.log('Trying Open Library fallback for:', title);
  return await fetchOpenLibraryCover(title, author);
}

/**
 * Fetch cover from Google Books API
 */
async function fetchGoogleBooksCover(
  title: string,
  author?: string
): Promise<string | null> {
  try {
    // Build search query
    let query = `intitle:${encodeURIComponent(title)}`;
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`;
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn('Google Books API request failed:', response.status);
      return null;
    }

    const data: GoogleBooksResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('No books found in Google Books for:', title);
      return null;
    }

    const book = data.items[0];
    const imageLinks = book.volumeInfo.imageLinks;

    if (!imageLinks) {
      console.log('No cover image found in Google Books for:', title);
      return null;
    }

    // Prefer thumbnail over smallThumbnail, and use https
    const coverUrl = imageLinks.thumbnail || imageLinks.smallThumbnail;

    if (coverUrl) {
      // Replace http with https for better security
      return coverUrl.replace('http://', 'https://');
    }

    return null;
  } catch (error) {
    console.error('Error fetching book cover from Google Books API:', error);
    return null;
  }
}
