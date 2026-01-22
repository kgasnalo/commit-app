import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('job-recommendations')

// ============================================================
// Types
// ============================================================

interface JobRecommendationsRequest {
  job_category: string
  limit?: number // Default: 10
  period?: 'alltime' | 'month' // Default: 'alltime'
}

interface RecommendedBook {
  book_id: string
  title: string
  author: string
  cover_url: string | null
  google_books_id: string | null
  read_count: number // Number of users who completed this book
}

// ============================================================
// Constants
// ============================================================

// k-anonymity threshold: only show recommendations if at least this many users
const MIN_USERS_THRESHOLD = 3

const VALID_JOB_CATEGORIES = [
  'engineer',
  'designer',
  'pm',
  'marketing',
  'sales',
  'hr',
  'cs',
  'founder',
  'other',
]

// ============================================================
// Helper Functions
// ============================================================

function errorResponse(status: number, errorCode: string, details?: string) {
  return new Response(
    JSON.stringify({ success: false, error: errorCode, details }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function successResponse(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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
    // Only allow POST
    if (req.method !== 'POST') {
      return errorResponse(405, 'METHOD_NOT_ALLOWED')
    }

    // Parse request body
    let body: JobRecommendationsRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body')
    }

    const { job_category, limit = 10, period = 'alltime' } = body

    // Validate job_category
    if (!job_category || !VALID_JOB_CATEGORIES.includes(job_category)) {
      return errorResponse(400, 'INVALID_JOB_CATEGORY', 'Job category is required and must be valid')
    }

    // Validate period
    if (period !== 'alltime' && period !== 'month') {
      return errorResponse(400, 'INVALID_PERIOD', 'Period must be "alltime" or "month"')
    }

    addBreadcrumb('Request received', 'info', { job_category, limit, period })

    // Initialize Supabase client (using service role for aggregation)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Step 1: Get user IDs with the same job_category AND show_in_ranking = true
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('job_category', job_category)
      .eq('show_in_ranking', true)

    if (usersError) {
      captureException(usersError, { location: 'job-recommendations.getUsers' })
      return errorResponse(500, 'DATABASE_ERROR', 'Failed to fetch users')
    }

    // Check k-anonymity threshold
    if (!eligibleUsers || eligibleUsers.length < MIN_USERS_THRESHOLD) {
      addBreadcrumb('Not enough users', 'info', { count: eligibleUsers?.length || 0 })
      return successResponse({
        recommendations: [],
        message: 'NOT_ENOUGH_DATA',
        user_count: eligibleUsers?.length || 0,
      })
    }

    const userIds = eligibleUsers.map((u) => u.id)
    addBreadcrumb('Eligible users found', 'info', { count: userIds.length })

    // Step 2: Get completed commitments from these users
    // Join with books table to get book details
    // Apply period filter if 'month'
    let commitmentsQuery = supabase
      .from('commitments')
      .select(`
        book_id,
        user_id,
        completed_at,
        books (
          id,
          title,
          author,
          cover_url,
          google_books_id
        )
      `)
      .in('user_id', userIds)
      .eq('status', 'completed')

    // Filter by period if 'month'
    if (period === 'month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      commitmentsQuery = commitmentsQuery.gte('completed_at', startOfMonth.toISOString())
      addBreadcrumb('Filtering by month', 'info', { startOfMonth: startOfMonth.toISOString() })
    }

    const { data: completedCommitments, error: commitmentsError } = await commitmentsQuery

    if (commitmentsError) {
      captureException(commitmentsError, { location: 'job-recommendations.getCommitments' })
      return errorResponse(500, 'DATABASE_ERROR', 'Failed to fetch commitments')
    }

    if (!completedCommitments || completedCommitments.length === 0) {
      return successResponse({
        recommendations: [],
        message: 'NO_COMPLETED_BOOKS',
        user_count: userIds.length,
      })
    }

    // Step 3: Aggregate by book, count unique users
    const bookCounts: Record<string, {
      book_id: string
      title: string
      author: string
      cover_url: string | null
      google_books_id: string | null
      user_ids: Set<string>
    }> = {}

    for (const commitment of completedCommitments) {
      const book = commitment.books as unknown as {
        id: string
        title: string
        author: string
        cover_url: string | null
        google_books_id: string | null
      }

      if (!book) continue

      if (!bookCounts[book.id]) {
        bookCounts[book.id] = {
          book_id: book.id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          google_books_id: book.google_books_id,
          user_ids: new Set(),
        }
      }

      bookCounts[book.id].user_ids.add(commitment.user_id)
    }

    // Step 4: Convert to array and sort by read_count (descending)
    const recommendations: RecommendedBook[] = Object.values(bookCounts)
      .map((item) => ({
        book_id: item.book_id,
        title: item.title,
        author: item.author,
        cover_url: item.cover_url,
        google_books_id: item.google_books_id,
        read_count: item.user_ids.size,
      }))
      .sort((a, b) => b.read_count - a.read_count)
      .slice(0, limit)

    addBreadcrumb('Recommendations generated', 'info', { count: recommendations.length })

    return successResponse({
      recommendations,
      job_category,
      period,
      user_count: userIds.length,
    })
  } catch (error) {
    captureException(error, { location: 'job-recommendations.handler' })
    console.error('Unexpected error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
})
