import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('use-lifeline')

interface UseLifelineRequest {
  commitment_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate Authorization header exists
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      addBreadcrumb('Missing Authorization header', 'auth')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[use-lifeline] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'CONFIGURATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // User client for auth verification & read queries (respects RLS)
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Admin client for update operations (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      addBreadcrumb('Auth failed for use-lifeline', 'auth', { error: authError?.message })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    addBreadcrumb('User authenticated', 'auth', { userId: user.id })

    // Parse request body with error handling
    let body: UseLifelineRequest
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { commitment_id } = body

    if (!commitment_id) {
      return new Response(
        JSON.stringify({ error: 'commitment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the commitment and verify ownership
    const { data: commitment, error: fetchError } = await supabaseClient
      .from('commitments')
      .select('id, user_id, book_id, status, deadline, is_freeze_used')
      .eq('id', commitment_id)
      .single()

    if (fetchError || !commitment) {
      return new Response(
        JSON.stringify({ error: 'Commitment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns this commitment
    if (commitment.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if commitment is active (pending or in_progress)
    const activeStatuses = ['pending', 'in_progress'];
    if (!activeStatuses.includes(commitment.status)) {
      return new Response(
        JSON.stringify({ error: 'Lifeline can only be used on active commitments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if lifeline was already used for ANY commitment on this book
    const { data: existingLifeline, error: lifelineCheckError } = await supabaseClient
      .from('commitments')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', commitment.book_id)
      .eq('is_freeze_used', true)
      .limit(1)

    if (lifelineCheckError) {
      console.error('Error checking lifeline usage:', lifelineCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to check lifeline status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingLifeline && existingLifeline.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Lifeline already used for this book' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check global cooldown: lifeline can only be used once every 30 days (across all books)
    // Note: new Date().toISOString() returns UTC timestamp (ISO 8601 format)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLifeline, error: globalCheckError } = await supabaseClient
      .from('commitments')
      .select('id, updated_at')
      .eq('user_id', user.id)
      .eq('is_freeze_used', true)
      .gte('updated_at', thirtyDaysAgo)
      .limit(1)

    if (globalCheckError) {
      console.error('Error checking global lifeline cooldown:', globalCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to check lifeline cooldown' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (recentLifeline && recentLifeline.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Lifeline cooldown active',
          error_code: 'GLOBAL_COOLDOWN',
          message: 'Lifeline can only be used once every 30 days',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate new deadline (+7 days)
    const currentDeadline = new Date(commitment.deadline)
    const newDeadline = new Date(currentDeadline.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Update commitment: extend deadline and mark lifeline as used
    // Optimistic locking: only update if is_freeze_used is still false (prevents race condition)
    // Note: new Date().toISOString() returns UTC timestamp (ISO 8601 format)
    const { data: updatedCommitment, error: updateError } = await supabaseAdmin
      .from('commitments')
      .update({
        deadline: newDeadline.toISOString(),
        is_freeze_used: true,
        updated_at: new Date().toISOString(), // UTC timestamp
      })
      .eq('id', commitment_id)
      .eq('is_freeze_used', false) // Optimistic lock: ensures no concurrent update
      .select()
      .single()

    if (updateError) {
      // Check if error is due to no rows matched (race condition - lifeline already used)
      if (updateError.code === 'PGRST116') {
        console.warn('Race condition detected: lifeline already used by concurrent request')
        return new Response(
          JSON.stringify({ error: 'Lifeline already used (concurrent request)' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.error('Error updating commitment:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to use lifeline' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Additional safety check: if no rows were updated
    if (!updatedCommitment) {
      console.warn('No rows updated - lifeline may have been used concurrently')
      return new Response(
        JSON.stringify({ error: 'Lifeline already used (concurrent request)' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful lifeline usage (critical business event)
    logBusinessEvent('lifeline_used', {
      userId: user.id,
      commitmentId: commitment_id,
      bookId: commitment.book_id,
      previousDeadline: commitment.deadline,
      newDeadline: newDeadline.toISOString(),
    })

    return new Response(
      JSON.stringify({
        success: true,
        new_deadline: newDeadline.toISOString(),
        commitment: updatedCommitment,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    captureException(error, {
      functionName: 'use-lifeline',
      extra: { errorMessage: String(error) },
    })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
