import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('delete-account')

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[delete-account] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'CONFIGURATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with auth context to verify the user
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      // Log error internally but don't expose details to client
      console.error('[delete-account] Auth error:', authError?.message)
      addBreadcrumb('Auth failed for delete-account', 'auth', { errorCode: authError?.status })
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Deleting user: ${user.id}`)
    addBreadcrumb('Delete account request authenticated', 'auth', { userId: user.id })

    // Initialize Admin Client with Service Role Key to perform user deletion
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // Check for unpaid penalty charges before deletion
    const { data: unpaidCharges, error: chargesError } = await supabaseAdmin
      .from('penalty_charges')
      .select('id')
      .eq('user_id', user.id)
      .in('charge_status', ['pending', 'processing', 'requires_action'])
      .limit(1)

    if (chargesError) {
      console.error('[delete-account] Error checking unpaid charges:', chargesError)
      // Continue with deletion - don't block on check failure
    } else if (unpaidCharges && unpaidCharges.length > 0) {
      console.log(`[delete-account] User ${user.id} has unpaid charges, blocking deletion`)
      addBreadcrumb('Delete blocked due to unpaid debt', 'business', { userId: user.id })
      return new Response(
        JSON.stringify({ error: 'UNPAID_DEBT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('[delete-account] Error deleting user:', {
        code: deleteError.code,
        message: deleteError.message,
        status: deleteError.status,
        name: deleteError.name,
      })
      captureException(new Error(`Failed to delete user: ${deleteError.message}`), {
        functionName: 'delete-account',
        userId: user.id,
        extra: {
          deleteErrorCode: deleteError.code,
          deleteErrorMessage: deleteError.message,
          deleteErrorStatus: deleteError.status,
        },
      })
      return new Response(
        JSON.stringify({
          error: 'Failed to delete account',
          details: deleteError.message,
          code: deleteError.code,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful account deletion (always recorded)
    logBusinessEvent('account_deleted', { userId: user.id })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    captureException(error, {
      functionName: 'delete-account',
      extra: { errorMessage: String(error) },
    })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})