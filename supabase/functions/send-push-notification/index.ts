/**
 * send-push-notification Edge Function
 * Phase 7.3 - Push Notification Infrastructure
 *
 * SECURITY: This is a SYSTEM-ONLY function.
 * - Only callable with SERVICE_ROLE_KEY or CRON_SECRET
 * - User JWTs are REJECTED with 403 Forbidden
 *
 * Usage (System/Admin only):
 * - Send to specific user: { userId: "uuid", title: "...", body: "..." }
 * - Send to multiple users: { userIds: ["uuid1", "uuid2"], title: "...", body: "..." }
 * - Send to all active users: { broadcast: true, title: "...", body: "..." }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('send-push-notification')

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'

interface SendPushRequest {
  userId?: string
  userIds?: string[]
  broadcast?: boolean
  title: string
  body: string
  data?: Record<string, unknown>
}

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: unknown
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Fixed: XOR lengths first to avoid early return that leaks length info
 */
function timingSafeEqual(a: string, b: string): boolean {
  // XOR lengths first - if different, result will be non-zero
  let result = a.length ^ b.length
  // Always iterate over the shorter string to avoid out-of-bounds
  const minLength = Math.min(a.length, b.length)
  for (let i = 0; i < minLength; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Verify that the caller is authorized (System/Admin only)
 * Returns true if authorized, false otherwise
 */
function verifySystemAuthorization(authHeader: string): boolean {
  // Extract the token from "Bearer <token>"
  const token = authHeader.replace('Bearer ', '').trim()

  // Get allowed secrets
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

  // Check against SERVICE_ROLE_KEY (primary method)
  if (serviceRoleKey && timingSafeEqual(token, serviceRoleKey)) {
    return true
  }

  // Check against CRON_SECRET (alternative for scheduled jobs)
  if (cronSecret && timingSafeEqual(token, cronSecret)) {
    return true
  }

  return false
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ==========================================
    // SECURITY: Verify System Authorization
    // ==========================================
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      console.warn('[SECURITY] Request rejected: No Authorization header')
      addBreadcrumb('Auth rejected - no header', 'security', {})
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CRITICAL: Verify the caller is System/Admin, NOT a regular user
    if (!verifySystemAuthorization(authHeader)) {
      console.warn('[SECURITY] Request rejected: Invalid credentials (possible user JWT attempt)')
      addBreadcrumb('System auth rejected - invalid credentials', 'security', {})
      captureException(new Error('Unauthorized system function access attempt'), {
        functionName: 'send-push-notification',
        extra: { reason: 'invalid_credentials' },
      })
      return new Response(
        JSON.stringify({ error: 'Forbidden: This endpoint is restricted to system use only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[SECURITY] System authorization verified successfully')
    addBreadcrumb('System authorization verified', 'security', {})

    // ==========================================
    // Create Supabase Admin Client
    // ==========================================
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Parse request body
    const { userId, userIds, broadcast, title, body, data }: SendPushRequest = await req.json()

    // Validate required fields
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine which users to send to
    let targetUserIds: string[] = []

    if (userId) {
      targetUserIds = [userId]
    } else if (userIds && userIds.length > 0) {
      targetUserIds = userIds
    } else if (broadcast) {
      // Get all users with active push tokens
      const { data: tokens, error } = await supabaseAdmin
        .from('expo_push_tokens')
        .select('user_id')
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching users for broadcast:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get unique user IDs
      const userIdSet = new Set<string>()
      tokens?.forEach((t: { user_id: string }) => userIdSet.add(t.user_id))
      targetUserIds = Array.from(userIdSet)
    } else {
      return new Response(
        JSON.stringify({ error: 'userId, userIds, or broadcast: true is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users to send to' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch active push tokens for target users
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('expo_push_tokens')
      .select('expo_push_token, user_id')
      .in('user_id', targetUserIds)
      .eq('is_active', true)

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active push tokens found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build Expo push messages
    const messages: ExpoPushMessage[] = tokens.map((token: { expo_push_token: string; user_id: string }) => ({
      to: token.expo_push_token,
      title,
      body,
      sound: 'default',
      data: data || {},
    }))

    // Send to Expo Push API (in batches of 100)
    const batchSize = 100
    const allTickets: ExpoPushTicket[] = []

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)

      const response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      const result = await response.json()

      if (result.data) {
        allTickets.push(...result.data)
      }
    }

    // Count successes and failures
    const successCount = allTickets.filter((t) => t.status === 'ok').length
    const failCount = allTickets.filter((t) => t.status === 'error').length

    // Log any errors for debugging
    const errors = allTickets.filter((t) => t.status === 'error')
    if (errors.length > 0) {
      console.log('Push notification errors:', JSON.stringify(errors))
    }

    console.log(`[send-push-notification] Sent ${successCount}/${tokens.length} notifications`)

    // Log push notification batch result (always recorded)
    logBusinessEvent('push_notification_batch', {
      sent: successCount,
      failed: failCount,
      total: tokens.length,
      isBroadcast: !!broadcast,
    })

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: tokens.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    captureException(error, {
      functionName: 'send-push-notification',
      extra: { errorMessage: String(error) },
    })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
