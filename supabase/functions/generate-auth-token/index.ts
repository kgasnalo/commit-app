import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('generate-auth-token')

// Token configuration
const TOKEN_LENGTH = 64
const TOKEN_EXPIRY_MINUTES = 5

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
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
      console.error('[generate-auth-token] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'CONFIGURATION_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // User client for auth verification (respects RLS)
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Admin client for token operations (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      addBreadcrumb('Auth failed for generate-auth-token', 'auth', { error: authError?.message })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    addBreadcrumb('User authenticated', 'auth', { userId: user.id })

    // Generate secure token
    const token = generateSecureToken(TOKEN_LENGTH)

    // Calculate expiry time (5 minutes from now)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString()

    // Store token in database
    const { error: insertError } = await supabaseAdmin
      .from('auth_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('[generate-auth-token] Failed to insert token:', insertError)
      captureException(insertError, {
        functionName: 'generate-auth-token',
        userId: user.id,
        extra: { errorCode: insertError.code },
      })
      return new Response(
        JSON.stringify({ error: 'Failed to generate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful token generation
    logBusinessEvent('auth_token_generated', {
      userId: user.id,
      expiresAt,
    })

    return new Response(
      JSON.stringify({
        success: true,
        token,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    captureException(error, {
      functionName: 'generate-auth-token',
      extra: { errorMessage: String(error) },
    })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
