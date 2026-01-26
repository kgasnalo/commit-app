import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
// TEMP: Disable Sentry to debug WORKER_ERROR
// import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry
// initSentry('create-commitment')

// ============================================================
// Types
// ============================================================

interface CreateCommitmentRequest {
  google_books_id?: string | null  // Optional for manual entries
  book_title: string
  book_author: string
  book_cover_url: string | null
  book_total_pages?: number | null  // Total pages for manual entries (slider max)
  is_manual_entry?: boolean         // Flag for manual book entries
  deadline: string // ISO 8601
  pledge_amount: number
  currency: string
  target_pages: number
}

// ============================================================
// Validation Constants
// ============================================================

const CURRENCY_LIMITS: Record<string, { min: number; max: number }> = {
  JPY: { min: 50, max: 50000 },
  USD: { min: 1, max: 350 },
  EUR: { min: 1, max: 300 },
  GBP: { min: 1, max: 250 },
  KRW: { min: 500, max: 500000 },
}

const MIN_DEADLINE_HOURS = 24
const MAX_PAGE_COUNT = 1000
const PAGE_COUNT_BUFFER = 10 // Allow target_pages to be up to 10 pages more than book's pageCount

// ============================================================
// Helper Functions
// ============================================================

function errorResponse(status: number, errorCode: string, details?: string) {
  return new Response(
    JSON.stringify({ success: false, error: errorCode, details }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function validateAmount(amount: number, currency: string): { valid: boolean; error?: string } {
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'INVALID_AMOUNT' }
  }

  const limits = CURRENCY_LIMITS[currency]
  if (!limits) {
    return { valid: false, error: 'INVALID_CURRENCY' }
  }

  if (amount < limits.min || amount > limits.max) {
    return { valid: false, error: 'INVALID_AMOUNT' }
  }

  return { valid: true }
}

function validateDeadline(deadlineStr: string): { valid: boolean; error?: string } {
  const deadline = new Date(deadlineStr)
  if (isNaN(deadline.getTime())) {
    return { valid: false, error: 'DEADLINE_INVALID' }
  }

  const minDeadline = new Date(Date.now() + MIN_DEADLINE_HOURS * 60 * 60 * 1000)
  if (deadline < minDeadline) {
    return { valid: false, error: 'DEADLINE_TOO_SOON' }
  }

  return { valid: true }
}

function validatePageCount(pages: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGE_COUNT) {
    return { valid: false, error: 'INVALID_PAGE_COUNT' }
  }
  return { valid: true }
}

async function fetchBookPageCount(googleBooksId: string): Promise<number | null> {
  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_BOOKS_API_KEY')
    const apiUrl = new URL(`https://www.googleapis.com/books/v1/volumes/${googleBooksId}`)
    if (GOOGLE_API_KEY) {
      apiUrl.searchParams.set('key', GOOGLE_API_KEY)
    }

    const response = await fetch(apiUrl.toString())
    if (!response.ok) {
      console.warn(`[create-commitment] Google Books API returned ${response.status}`)
      return null
    }

    const data = await response.json()
    const pageCount = data?.volumeInfo?.pageCount
    return typeof pageCount === 'number' ? pageCount : null
  } catch (error) {
    console.warn('[create-commitment] Google Books API error:', error)
    return null
  }
}

// ============================================================
// Main Handler
// ============================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    console.log('[create-commitment] Auth header present:', !!authHeader)
    console.log('[create-commitment] Auth header length:', authHeader?.length || 0)

    if (!authHeader) {
      console.error('[create-commitment] No Authorization header received')
      return errorResponse(401, 'UNAUTHORIZED', 'No Authorization header')
    }

    // Validate Bearer prefix
    if (!authHeader.startsWith('Bearer ')) {
      console.error('[create-commitment] Invalid auth header format (missing Bearer prefix)')
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid auth header format')
    }

    console.log('[create-commitment] Token snippet:', authHeader.substring(7, 27) + '...')

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[create-commitment] Missing required environment variables')
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing Supabase credentials')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('[create-commitment] Auth verification failed:', authError?.message)
      console.error('[create-commitment] Auth error code:', authError?.status)
      // addBreadcrumb('Auth failed', 'auth', { error: authError?.message })
      return errorResponse(401, 'UNAUTHORIZED', authError?.message || 'Token validation failed')
    }

    // Set user context for Sentry
    // addBreadcrumb('User authenticated', 'auth', { userId: user.id })

    // 2. Parse request body
    let body: CreateCommitmentRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body')
    }

    const {
      google_books_id,
      book_title,
      book_author,
      book_cover_url,
      book_total_pages,
      is_manual_entry,
      deadline,
      pledge_amount,
      currency,
      target_pages,
    } = body

    // 3. Validate required fields
    if (!book_title || !deadline || !pledge_amount || !currency || !target_pages) {
      return errorResponse(400, 'MISSING_FIELDS')
    }

    // google_books_id is required for non-manual entries
    if (!is_manual_entry && !google_books_id) {
      return errorResponse(400, 'MISSING_GOOGLE_BOOKS_ID')
    }

    // For manual entries, book_total_pages should be provided
    if (is_manual_entry && (!book_total_pages || book_total_pages < 1)) {
      return errorResponse(400, 'MISSING_TOTAL_PAGES')
    }

    // 4. Validate amount
    const amountValidation = validateAmount(pledge_amount, currency)
    if (!amountValidation.valid) {
      return errorResponse(400, amountValidation.error!)
    }

    // 5. Validate deadline
    const deadlineValidation = validateDeadline(deadline)
    if (!deadlineValidation.valid) {
      return errorResponse(400, deadlineValidation.error!)
    }

    // 6. Validate page count (basic)
    const pageValidation = validatePageCount(target_pages)
    if (!pageValidation.valid) {
      return errorResponse(400, pageValidation.error!)
    }

    // 7. Page count validation
    if (!is_manual_entry && google_books_id) {
      // Use client-provided book_total_pages if available (more reliable than re-fetching)
      // Google Books search API vs individual lookup may return different page counts
      const bookPageCount = book_total_pages ?? await fetchBookPageCount(google_books_id)
      if (bookPageCount !== null) {
        if (target_pages > bookPageCount + PAGE_COUNT_BUFFER) {
          console.warn(
            `[create-commitment] Page count exceeds book: ${target_pages} > ${bookPageCount} + ${PAGE_COUNT_BUFFER}`
          )
          return errorResponse(400, 'PAGE_COUNT_EXCEEDS_BOOK')
        }
      } else {
        console.warn('[create-commitment] Could not verify page count, proceeding anyway')
      }
    } else if (is_manual_entry && book_total_pages) {
      // For manual books, validate against user-provided total pages
      if (target_pages > book_total_pages + PAGE_COUNT_BUFFER) {
        console.warn(
          `[create-commitment] Page count exceeds manual book: ${target_pages} > ${book_total_pages} + ${PAGE_COUNT_BUFFER}`
        )
        return errorResponse(400, 'PAGE_COUNT_EXCEEDS_BOOK')
      }
    }

    // 8. Use SERVICE_ROLE for database operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // 9. Book upsert
    let bookId: string

    // Ensure HTTPS for cover URL (iOS ATS requirement)
    let sanitizedCoverUrl = book_cover_url
    if (sanitizedCoverUrl) {
      sanitizedCoverUrl = sanitizedCoverUrl
        .replace('http:', 'https:')
        .replace(/&edge=curl/g, '')
    }

    if (is_manual_entry) {
      // Manual book entry - always create new with generated ID
      const manualId = `manual_${crypto.randomUUID()}`

      const { data: newBook, error: bookError } = await supabaseAdmin
        .from('books')
        .insert({
          google_books_id: manualId,  // Use generated ID for uniqueness
          title: book_title,
          author: book_author || 'Unknown Author',
          cover_url: sanitizedCoverUrl,
          total_pages: book_total_pages,
          is_manual: true,
        })
        .select('id')
        .single()

      if (bookError) {
        console.error('[create-commitment] Manual book creation failed:', bookError)
        return errorResponse(500, 'BOOK_CREATION_FAILED')
      }
      bookId = newBook.id
      console.log(`[create-commitment] Created manual book: ${bookId}, manualId: ${manualId}`)
    } else {
      // Google Books entry - check if exists first
      const { data: existingBook } = await supabaseAdmin
        .from('books')
        .select('id')
        .eq('google_books_id', google_books_id)
        .single()

      if (existingBook) {
        bookId = existingBook.id
      } else {
        const { data: newBook, error: bookError } = await supabaseAdmin
          .from('books')
          .insert({
            google_books_id,
            title: book_title,
            author: book_author || 'Unknown Author',
            cover_url: sanitizedCoverUrl,
            is_manual: false,
          })
          .select('id')
          .single()

        if (bookError) {
          console.error('[create-commitment] Book creation failed:', bookError)
          return errorResponse(500, 'BOOK_CREATION_FAILED')
        }
        bookId = newBook.id
      }
    }

    // 10. Create commitment
    const { data: commitment, error: commitmentError } = await supabaseAdmin
      .from('commitments')
      .insert({
        user_id: user.id,
        book_id: bookId,
        deadline,
        status: 'pending',
        pledge_amount,
        currency,
        target_pages,
      })
      .select('id')
      .single()

    if (commitmentError) {
      console.error('[create-commitment] Commitment creation failed:', commitmentError)
      return errorResponse(500, 'COMMITMENT_CREATION_FAILED')
    }

    console.log(`[create-commitment] Success: user=${user.id}, commitment=${commitment.id}, book=${bookId}`)

    // Log business event (always recorded, not just on errors)
    // logBusinessEvent('commitment_created', {
    //   commitmentId: commitment.id,
    //   bookId,
    //   userId: user.id,
    //   amount: pledge_amount,
    //   currency,
    // })

    return new Response(
      JSON.stringify({
        success: true,
        commitment_id: commitment.id,
        book_id: bookId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[create-commitment] Unexpected error:', error)
    // captureException(error, {
    //   functionName: 'create-commitment',
    //   extra: { errorMessage: String(error) },
    // })
    return errorResponse(500, 'INTERNAL_ERROR', String(error))
  }
})
