import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('isbn-lookup')

interface ISBNLookupRequest {
  isbn: string
}

interface BookInfo {
  id: string
  title: string
  authors: string[]
  thumbnail: string | null
}

// Validate ISBN-13 format (EAN-13: starts with 978 or 979)
function isValidISBN13(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '')
  return /^(978|979)\d{10}$/.test(cleaned)
}

// Validate ISBN-10 format
function isValidISBN10(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '')
  return /^\d{9}[\dXx]$/.test(cleaned)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { isbn }: ISBNLookupRequest = await req.json()

    if (!isbn) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_ISBN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean and validate ISBN
    const cleanedISBN = isbn.replace(/[-\s]/g, '')

    if (!isValidISBN13(cleanedISBN) && !isValidISBN10(cleanedISBN)) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_ISBN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Google Books API key (optional - works without key but has rate limits)
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_BOOKS_API_KEY')

    // Build API URL
    const apiUrl = new URL('https://www.googleapis.com/books/v1/volumes')
    apiUrl.searchParams.set('q', `isbn:${cleanedISBN}`)
    if (GOOGLE_API_KEY) {
      apiUrl.searchParams.set('key', GOOGLE_API_KEY)
    }

    // Fetch from Google Books API
    addBreadcrumb('Fetching from Google Books API', 'http', { isbn: cleanedISBN })
    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      console.error('Google Books API error:', response.status, response.statusText)
      addBreadcrumb('Google Books API error', 'error', { status: response.status })
      return new Response(
        JSON.stringify({ success: false, error: 'API_ERROR' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    // Check if book was found
    if (!data.items || data.items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'BOOK_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract book info from first result
    const googleBook = data.items[0]
    const volumeInfo = googleBook.volumeInfo || {}

    // Get thumbnail URL and ensure HTTPS
    let thumbnail: string | null = null
    if (volumeInfo.imageLinks) {
      thumbnail = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || null
      if (thumbnail) {
        thumbnail = thumbnail.replace('http:', 'https:')
      }
    }

    const book: BookInfo = {
      id: googleBook.id,
      title: volumeInfo.title || 'Unknown Title',
      authors: volumeInfo.authors || [],
      thumbnail,
    }

    return new Response(
      JSON.stringify({ success: true, book }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    captureException(error, {
      functionName: 'isbn-lookup',
      extra: { errorMessage: String(error) },
    })
    return new Response(
      JSON.stringify({ success: false, error: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
