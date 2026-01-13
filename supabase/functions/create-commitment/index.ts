import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb, incrementMetric } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('create-commitment')

// ============================================================
// Types
// ============================================================

interface CreateCommitmentRequest {
  google_books_id: string
  book_title: string
  book_author: string
  book_cover_url: string | null
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
    if (!authHeader) {
      return errorResponse(401, 'UNAUTHORIZED')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.warn('[create-commitment] Auth failed:', authError?.message)
      addBreadcrumb('Auth failed', 'auth', { error: authError?.message })
      return errorResponse(401, 'UNAUTHORIZED')
    }

    // Set user context for Sentry
    addBreadcrumb('User authenticated', 'auth', { userId: user.id })

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
      deadline,
      pledge_amount,
      currency,
      target_pages,
    } = body

    // 3. Validate required fields
    if (!google_books_id || !book_title || !deadline || !pledge_amount || !currency || !target_pages) {
      return errorResponse(400, 'MISSING_FIELDS')
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

    // 7. Google Books page count validation (soft fail)
    const bookPageCount = await fetchBookPageCount(google_books_id)
    if (bookPageCount !== null) {
      if (target_pages > bookPageCount + PAGE_COUNT_BUFFER) {
        console.warn(
          `[create-commitment] Page count exceeds book: ${target_pages} > ${bookPageCount} + ${PAGE_COUNT_BUFFER}`
        )
        return errorResponse(400, 'PAGE_COUNT_EXCEEDS_BOOK')
      }
    } else {
      console.warn('[create-commitment] Could not verify page count from Google Books, proceeding anyway')
    }

    // 8. Use SERVICE_ROLE for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 9. Book upsert
    let bookId: string

    // Check if book exists
    const { data: existingBook } = await supabaseAdmin
      .from('books')
      .select('id')
      .eq('google_books_id', google_books_id)
      .single()

    if (existingBook) {
      bookId = existingBook.id
    } else {
      // Ensure HTTPS for cover URL (iOS ATS requirement)
      let sanitizedCoverUrl = book_cover_url
      if (sanitizedCoverUrl) {
        sanitizedCoverUrl = sanitizedCoverUrl
          .replace('http:', 'https:')
          .replace(/&edge=curl/g, '')
      }

      const { data: newBook, error: bookError } = await supabaseAdmin
        .from('books')
        .insert({
          google_books_id,
          title: book_title,
          author: book_author || 'Unknown Author',
          cover_url: sanitizedCoverUrl,
        })
        .select('id')
        .single()

      if (bookError) {
        console.error('[create-commitment] Book creation failed:', bookError)
        return errorResponse(500, 'BOOK_CREATION_FAILED')
      }
      bookId = newBook.id
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

    // Track success metrics
    addBreadcrumb('Commitment created', 'commitment', {
      commitmentId: commitment.id,
      bookId,
      userId: user.id,
      amount: pledge_amount,
      currency,
    })
    incrementMetric('commitment_created', 1, { currency })

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
    captureException(error, {
      functionName: 'create-commitment',
      extra: { errorMessage: String(error) },
    })
    return errorResponse(500, 'INTERNAL_ERROR', String(error))
  }
})
