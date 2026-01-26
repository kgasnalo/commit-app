import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import Stripe from 'https://esm.sh/stripe@17'
import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry
initSentry('admin-actions')

// Lazy initialization to ensure env var is available
function getStripe(): Stripe {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  })
}

// ============================================================
// Configuration
// ============================================================

// Comma-separated list of allowed admin emails
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map(e => e.trim().toLowerCase())

// ============================================================
// Types
// ============================================================

interface AdminActionRequest {
  action: 'REFUND' | 'MARK_COMPLETE'
  target_id: string // penalty_charge_id or commitment_id
  reason?: string
}

function errorResponse(status: number, errorCode: string, details?: string) {
  return new Response(
    JSON.stringify({ success: false, error: errorCode, details }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================================
// Main Handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Auth Check (Layer 1: Valid User)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse(401, 'UNAUTHORIZED')
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('[admin-actions] Missing required environment variables')
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing Supabase credentials')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user || !user.email) {
      return errorResponse(401, 'UNAUTHORIZED')
    }

    // 2. Admin Check (Layer 2: Email Whitelist)
    // CRITICAL: Verify the user's email against the allowlist
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.warn(`[admin-actions] Unauthorized access attempt by user: ${user.id}`)
      addBreadcrumb('Admin access denied (email not in whitelist)', 'security', { userId: user.id })
      captureException(new Error('Unauthorized admin access attempt'), {
        functionName: 'admin-actions',
        userId: user.id,
      })
      return errorResponse(403, 'FORBIDDEN', 'User is not an admin')
    }

    // 3. Admin Check (Layer 3: Database Role Verification)
    // CRITICAL: Additional defense - verify user's role in database
    const supabaseAdminForRoleCheck = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    const { data: userRecord, error: roleError } = await supabaseAdminForRoleCheck
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userRecord || userRecord.role !== 'Founder') {
      console.warn(`[admin-actions] Role check failed for user: ${user.id}, role: ${userRecord?.role}`)
      addBreadcrumb('Admin access denied (role mismatch)', 'security', {
        userId: user.id,
        actualRole: userRecord?.role ?? 'unknown'
      })
      captureException(new Error('Admin role verification failed'), {
        functionName: 'admin-actions',
        userId: user.id,
        extra: { actualRole: userRecord?.role },
      })
      return errorResponse(403, 'FORBIDDEN', 'User does not have admin role')
    }

    // Admin authenticated (log user ID only, not email for privacy)
    addBreadcrumb('Admin authenticated', 'auth', { adminUserId: user.id, role: userRecord.role })

    // 4. Parse Request
    let body: AdminActionRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'INVALID_REQUEST')
    }

    const { action, target_id, reason } = body
    if (!action || !target_id) {
      return errorResponse(400, 'MISSING_FIELDS')
    }

    // 5. Use Service Role for Admin Operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // 6. Extract client IP address from headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    // 7. Handle Actions
    if (action === 'REFUND') {
      return await handleRefund(supabaseAdmin, user, target_id, reason, ipAddress)
    } else if (action === 'MARK_COMPLETE') {
      return await handleMarkComplete(supabaseAdmin, user, target_id, reason, ipAddress)
    } else {
      return errorResponse(400, 'INVALID_ACTION')
    }

  } catch (error) {
    console.error('[admin-actions] Unexpected error:', error)
    captureException(error, {
      functionName: 'admin-actions',
      extra: { errorMessage: String(error) },
    })
    return errorResponse(500, 'INTERNAL_ERROR', String(error))
  }
})

// ============================================================
// Action Handlers
// ============================================================

async function handleRefund(supabase: any, adminUser: any, penaltyChargeId: string, reason: string | undefined, ipAddress: string) {
  addBreadcrumb('Refund action started', 'admin', { penaltyChargeId, adminUserId: adminUser.id })

  // 1. Fetch Charge
  const { data: charge, error: fetchError } = await supabase
    .from('penalty_charges')
    .select('*, commitments(*)')
    .eq('id', penaltyChargeId)
    .single()

  if (fetchError || !charge) {
    return errorResponse(404, 'CHARGE_NOT_FOUND')
  }

  if (charge.charge_status === 'refunded') {
    return errorResponse(400, 'ALREADY_REFUNDED')
  }

  if (!charge.stripe_payment_intent_id) {
    return errorResponse(400, 'NO_PAYMENT_INTENT', 'Cannot refund a charge without a Stripe Payment Intent')
  }

  // 2. Pre-validate Stripe configuration before any DB changes
  let stripe: Stripe
  try {
    stripe = getStripe()
  } catch (error) {
    console.error('[admin-actions] Stripe not configured:', error)
    return errorResponse(500, 'STRIPE_NOT_CONFIGURED', 'Stripe is not properly configured')
  }

  // 3. Set DB status to 'refund_pending' BEFORE attempting Stripe refund
  // This ensures consistency: even if later steps fail, we know a refund was attempted
  // Optimistic lock: only update if charge_status is still 'succeeded' (prevents race conditions)
  const { error: pendingError, count: updateCount } = await supabase
    .from('penalty_charges')
    .update({
      charge_status: 'refund_pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', penaltyChargeId)
    .eq('charge_status', 'succeeded')

  if (pendingError) {
    console.error('[admin-actions] Failed to set refund_pending:', pendingError)
    return errorResponse(500, 'DB_UPDATE_FAILED', 'Failed to prepare refund')
  }

  // 4. Process Stripe Refund with idempotency key to prevent duplicate refunds
  try {
    await stripe.refunds.create(
      {
        payment_intent: charge.stripe_payment_intent_id,
        reason: 'requested_by_customer', // or 'duplicate', 'fraudulent'
      },
      {
        idempotencyKey: `refund_${penaltyChargeId}`,
      }
    )
    addBreadcrumb('Stripe refund processed', 'payment', {
      paymentIntentId: charge.stripe_payment_intent_id,
      amount: charge.amount,
      currency: charge.currency,
    })
  } catch (stripeError) {
    console.error('[admin-actions] Stripe Refund Failed:', stripeError)
    // Revert DB status back to 'succeeded' since refund failed
    await supabase
      .from('penalty_charges')
      .update({
        charge_status: 'succeeded', // Revert to original status
        updated_at: new Date().toISOString()
      })
      .eq('id', penaltyChargeId)

    captureException(stripeError, {
      functionName: 'admin-actions',
      extra: { action: 'REFUND', penaltyChargeId, stripeError: stripeError.message },
    })
    return errorResponse(500, 'STRIPE_REFUND_FAILED', stripeError.message)
  }

  // 4. Update DB status to 'refunded' after successful Stripe refund
  const { error: updateError } = await supabase
    .from('penalty_charges')
    .update({
      charge_status: 'refunded',
      updated_at: new Date().toISOString()
    })
    .eq('id', penaltyChargeId)

  if (updateError) {
    console.error('[admin-actions] DB Update Failed after Stripe refund:', updateError)
    // Critical: Money refunded but DB shows 'refund_pending' - log severe alert
    // This state can be investigated and fixed manually
    captureException(new Error('DB update failed after successful Stripe refund'), {
      functionName: 'admin-actions',
      extra: {
        penaltyChargeId,
        stripePaymentIntentId: charge.stripe_payment_intent_id,
        currentDbStatus: 'refund_pending',
        expectedDbStatus: 'refunded',
      },
    })
    return errorResponse(500, 'DB_UPDATE_FAILED_AFTER_REFUND')
  }

  // 5. Audit Log
  await logAudit(supabase, adminUser, 'REFUND', 'penalty_charges', penaltyChargeId, {
    amount: charge.amount,
    currency: charge.currency,
    reason,
    stripe_pi: charge.stripe_payment_intent_id
  }, ipAddress)

  // Log successful refund (always recorded)
  logBusinessEvent('admin_refund_success', {
    penaltyChargeId,
    adminUserId: adminUser.id,
    amount: charge.amount,
    currency: charge.currency,
  })

  return new Response(
    JSON.stringify({ success: true, message: 'Refund processed successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleMarkComplete(supabase: any, adminUser: any, commitmentId: string, reason: string | undefined, ipAddress: string) {
  addBreadcrumb('Mark complete action started', 'admin', { commitmentId, adminUserId: adminUser.id })

  // 1. Fetch Commitment
  const { data: commitment, error: fetchError } = await supabase
    .from('commitments')
    .select('*')
    .eq('id', commitmentId)
    .single()

  if (fetchError || !commitment) {
    return errorResponse(404, 'COMMITMENT_NOT_FOUND')
  }

  // 2. Update Status
  const { error: updateError } = await supabase
    .from('commitments')
    .update({ 
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', commitmentId)

  if (updateError) {
    return errorResponse(500, 'DB_UPDATE_FAILED')
  }

  // 3. Audit Log
  await logAudit(supabase, adminUser, 'MARK_COMPLETE', 'commitments', commitmentId, {
    previous_status: commitment.status,
    reason
  }, ipAddress)

  // Log successful mark complete (always recorded)
  logBusinessEvent('admin_mark_complete_success', {
    commitmentId,
    adminUserId: adminUser.id,
    previousStatus: commitment.status,
  })

  return new Response(
    JSON.stringify({ success: true, message: 'Commitment marked as completed' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function logAudit(supabase: any, adminUser: any, action: string, table: string, id: string, details: any, ipAddress: string) {
  // NOTE: admin_email is redacted to comply with PII policy - use admin_user_id for audit trail
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: adminUser.id,
    admin_email: '[REDACTED]',
    action_type: action,
    target_resource_table: table,
    target_resource_id: id,
    details,
    ip_address: ipAddress,
  })
}