import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user || !user.email) {
      return errorResponse(401, 'UNAUTHORIZED')
    }

    // 2. Admin Check (Layer 2: Email Whitelist)
    // CRITICAL: Verify the user's email against the allowlist
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.warn(`[admin-actions] Unauthorized access attempt by: ${user.email}`)
      return errorResponse(403, 'FORBIDDEN', 'User is not an admin')
    }

    // 3. Parse Request
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

    // 4. Use Service Role for Admin Operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Handle Actions
    if (action === 'REFUND') {
      return await handleRefund(supabaseAdmin, user, target_id, reason)
    } else if (action === 'MARK_COMPLETE') {
      return await handleMarkComplete(supabaseAdmin, user, target_id, reason)
    } else {
      return errorResponse(400, 'INVALID_ACTION')
    }

  } catch (error) {
    console.error('[admin-actions] Unexpected error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', String(error))
  }
})

// ============================================================
// Action Handlers
// ============================================================

async function handleRefund(supabase: any, adminUser: any, penaltyChargeId: string, reason?: string) {
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

  // 2. Process Stripe Refund
  try {
    await stripe.refunds.create({
      payment_intent: charge.stripe_payment_intent_id,
      reason: 'requested_by_customer', // or 'duplicate', 'fraudulent'
    })
  } catch (stripeError) {
    console.error('[admin-actions] Stripe Refund Failed:', stripeError)
    return errorResponse(500, 'STRIPE_REFUND_FAILED', stripeError.message)
  }

  // 3. Update DB Status
  const { error: updateError } = await supabase
    .from('penalty_charges')
    .update({ 
      charge_status: 'refunded',
      updated_at: new Date().toISOString()
    })
    .eq('id', penaltyChargeId)

  if (updateError) {
    console.error('[admin-actions] DB Update Failed:', updateError)
    // Critical: Money refunded but DB not updated. Should log severe alert.
    return errorResponse(500, 'DB_UPDATE_FAILED_AFTER_REFUND')
  }

  // 4. Audit Log
  await logAudit(supabase, adminUser, 'REFUND', 'penalty_charges', penaltyChargeId, {
    amount: charge.amount,
    currency: charge.currency,
    reason,
    stripe_pi: charge.stripe_payment_intent_id
  })

  return new Response(
    JSON.stringify({ success: true, message: 'Refund processed successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleMarkComplete(supabase: any, adminUser: any, commitmentId: string, reason?: string) {
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
  })

  return new Response(
    JSON.stringify({ success: true, message: 'Commitment marked as completed' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function logAudit(supabase: any, adminUser: any, action: string, table: string, id: string, details: any) {
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: adminUser.id,
    admin_email: adminUser.email,
    action_type: action,
    target_resource_table: table,
    target_resource_id: id,
    details,
    ip_address: '0.0.0.0' // Edge function context might not expose IP easily without extra headers
  })
}