import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UseLifelineRequest {
  commitment_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { commitment_id }: UseLifelineRequest = await req.json()

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

    // Check if commitment is pending
    if (commitment.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Lifeline can only be used on pending commitments' }),
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

    // Calculate new deadline (+7 days)
    const currentDeadline = new Date(commitment.deadline)
    const newDeadline = new Date(currentDeadline.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Update commitment: extend deadline and mark lifeline as used
    const { data: updatedCommitment, error: updateError } = await supabaseClient
      .from('commitments')
      .update({
        deadline: newDeadline.toISOString(),
        is_freeze_used: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commitment_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating commitment:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to use lifeline' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
