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
 */
export function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Fetch book cover image URL from Google Books API
 * @param title - Book title
 * @param author - Book author (optional)
 * @returns Cover image URL or null if not found
 */
export async function fetchBookCover(
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
      console.log('No books found for:', title);
      return null;
    }

    const book = data.items[0];
    const imageLinks = book.volumeInfo.imageLinks;

    if (!imageLinks) {
      console.log('No cover image found for:', title);
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
