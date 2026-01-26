/**
 * process-expired-commitments Edge Function
 * Phase 7.4 - The Reaper: Automated Deadline Enforcer
 *
 * SECURITY: This is a SYSTEM-ONLY function.
 * - Only callable with SERVICE_ROLE_KEY or CRON_SECRET
 * - User JWTs are REJECTED with 403 Forbidden
 *
 * Process flow:
 * 1. Find all commitments WHERE status='pending' AND deadline < NOW()
 * 2. For each commitment:
 *    a. Update status to 'defaulted', set defaulted_at
 *    b. Create penalty_charge record (with idempotency check)
 *    c. Attempt Stripe charge (off-session PaymentIntent)
 *    d. Update penalty_charge with result
 *    e. Send push notification
 *
 * Invocation:
 * - Hourly via pg_cron (normal mode)
 * - Every 4 hours via pg_cron (retry mode for failed charges)
 * - Manual test via curl with SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@17'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentry, captureException, addBreadcrumb, logBusinessEvent } from '../_shared/sentry.ts'

// Initialize Sentry for this function
initSentry('process-expired-commitments')

// ==========================================
// Types
// ==========================================

interface ProcessRequest {
  triggered_at?: string
  source?: string
  retry_mode?: boolean
}

interface ExpiredCommitment {
  id: string
  user_id: string
  book_id: string
  pledge_amount: number
  currency: string
  deadline: string
}

interface UserPaymentInfo {
  id: string
  email: string
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
}

interface BookInfo {
  id: string
  title: string
}

interface ChargeResult {
  success: boolean
  stripe_payment_intent_id?: string
  failure_reason?: string
  failure_code?: string
}

interface ProcessingStats {
  processed: number
  charged: number
  failed: number
  skipped: number
  errors: string[]
}

// ==========================================
// Security Functions (from Phase 7.3)
// ==========================================

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
  const token = authHeader.replace('Bearer ', '').trim()

  // SECURITY: Reject empty tokens immediately to prevent timingSafeEqual('', '') returning true
  if (!token) {
    console.warn('[SECURITY] Empty token rejected')
    return false
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = Deno.env.get('CRON_SECRET')

  // SECURITY: Fail if no authorization secrets are configured (configuration error)
  if (!serviceRoleKey && !cronSecret) {
    console.error('[SECURITY] No authorization secrets configured')
    return false
  }

  if (serviceRoleKey && serviceRoleKey.length > 0 && timingSafeEqual(token, serviceRoleKey)) {
    return true
  }

  if (cronSecret && cronSecret.length > 0 && timingSafeEqual(token, cronSecret)) {
    return true
  }

  return false
}

// ==========================================
// Currency Handling
// ==========================================

/**
 * Currencies that don't use decimal places (amount in smallest unit = amount in base unit)
 * https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL_CURRENCIES = [
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
];

/**
 * Convert amount to Stripe's smallest currency unit
 * - JPY, KRW, etc: amount stays the same (¥1000 → 1000)
 * - USD, EUR, GBP, etc: multiply by 100 ($10 → 1000 cents)
 */
function toStripeAmount(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

// ==========================================
// Stripe Client
// ==========================================

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

// ==========================================
// Helper Functions
// ==========================================

/**
 * Send push notification via the existing send-push-notification function
 */
async function sendPushNotification(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ userId, title, body, data }),
    })

    if (!response.ok) {
      console.error(`Failed to send push notification: ${response.status}`)
    }
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

/**
 * Format currency amount for display
 * Note: DB stores amounts in base currency units (e.g., $20 as "20", ¥1000 as "1000")
 */
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    // Zero-decimal currencies don't show decimal places
    minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase()) ? 0 : 2,
    maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase()) ? 0 : 2,
  }).format(amount)
}

// ==========================================
// Main Processing Logic
// ==========================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stats: ProcessingStats = {
    processed: 0,
    charged: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  try {
    // ==========================================
    // SECURITY: Verify System Authorization
    // ==========================================
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      console.warn('[SECURITY] Request rejected: No Authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!verifySystemAuthorization(authHeader)) {
      console.warn('[SECURITY] Request rejected: Invalid credentials (possible user JWT attempt)')
      return new Response(
        JSON.stringify({ error: 'Forbidden: This endpoint is restricted to system use only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[SECURITY] System authorization verified successfully')

    // Parse request body
    const body: ProcessRequest = await req.json().catch(() => {
      console.warn('[Reaper] Empty or invalid request body received')
      return {}
    })
    const isRetryMode = body.retry_mode === true

    console.log(`[Reaper] Starting ${isRetryMode ? 'RETRY' : 'NORMAL'} mode. Source: ${body.source || 'unknown'}`)

    // ==========================================
    // Initialize Clients
    // ==========================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // CRITICAL: Validate environment variables before proceeding
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Reaper] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'CONFIGURATION_ERROR', details: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    let stripe: Stripe
    try {
      stripe = getStripe()
    } catch (error) {
      console.error('[Reaper] Stripe not configured:', error)
      return new Response(
        JSON.stringify({ error: 'Stripe not configured', details: String(error) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // Process Mode: Normal or Retry
    // ==========================================

    if (isRetryMode) {
      // RETRY MODE: Process failed charges that are due for retry
      const { data: failedCharges, error: fetchError } = await supabaseAdmin
        .from('penalty_charges')
        .select(`
          id,
          commitment_id,
          user_id,
          amount,
          currency,
          stripe_customer_id,
          stripe_payment_method_id,
          attempt_count
        `)
        .eq('charge_status', 'failed')
        .lt('attempt_count', 3)
        .lte('next_retry_at', new Date().toISOString())
        .limit(50)

      if (fetchError) {
        console.error('[Reaper] Error fetching failed charges:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch charges for retry', details: fetchError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[Reaper] Found ${failedCharges?.length || 0} failed charges to retry`)

      for (const charge of failedCharges || []) {
        stats.processed++

        // Get book info for notification
        const { data: commitment } = await supabaseAdmin
          .from('commitments')
          .select('book_id')
          .eq('id', charge.commitment_id)
          .single()

        const { data: book } = await supabaseAdmin
          .from('books')
          .select('title')
          .eq('id', commitment?.book_id)
          .single()

        // Attempt charge
        const chargeResult = await attemptStripeCharge(
          stripe,
          charge.amount,
          charge.currency,
          charge.stripe_customer_id,
          charge.stripe_payment_method_id,
          charge.commitment_id,
          charge.id
        )

        // Update charge record
        const newAttemptCount = charge.attempt_count + 1
        const updateData: Record<string, unknown> = {
          attempt_count: newAttemptCount,
          last_attempt_at: new Date().toISOString(),
        }

        if (chargeResult.success) {
          updateData.charge_status = 'succeeded'
          updateData.stripe_payment_intent_id = chargeResult.stripe_payment_intent_id
          stats.charged++

          // Send success notification
          await sendPushNotification(
            supabaseUrl,
            serviceRoleKey,
            charge.user_id,
            'Commitment Expired - Charged',
            `Your commitment for '${book?.title || 'your book'}' expired. ${formatAmount(charge.amount, charge.currency)} has been charged to your card.`,
            { type: 'penalty_charged', commitment_id: charge.commitment_id }
          )
        } else {
          stats.failed++
          updateData.failure_reason = chargeResult.failure_reason
          updateData.failure_code = chargeResult.failure_code

          if (newAttemptCount >= 3) {
            // Max retries reached
            updateData.charge_status = 'failed'
            await sendPushNotification(
              supabaseUrl,
              serviceRoleKey,
              charge.user_id,
              'Payment Failed',
              `We couldn't process the ${formatAmount(charge.amount, charge.currency)} charge for '${book?.title || 'your book'}'. Please update your payment method.`,
              { type: 'penalty_failed', commitment_id: charge.commitment_id }
            )
          } else {
            // Schedule next retry (4 hours later)
            const nextRetry = new Date()
            nextRetry.setHours(nextRetry.getHours() + 4)
            updateData.next_retry_at = nextRetry.toISOString()
          }
        }

        await supabaseAdmin
          .from('penalty_charges')
          .update(updateData)
          .eq('id', charge.id)
      }

    } else {
      // NORMAL MODE: Find and process expired commitments
      const { data: expiredCommitments, error: fetchError } = await supabaseAdmin
        .from('commitments')
        .select('id, user_id, book_id, pledge_amount, currency, deadline')
        .eq('status', 'pending')
        .lt('deadline', new Date().toISOString())
        .limit(100)

      if (fetchError) {
        console.error('[Reaper] Error fetching expired commitments:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch expired commitments', details: fetchError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[Reaper] Found ${expiredCommitments?.length || 0} expired commitments`)

      for (const commitment of expiredCommitments || []) {
        stats.processed++

        try {
          await processCommitment(
            supabaseAdmin,
            stripe,
            supabaseUrl,
            serviceRoleKey,
            commitment,
            stats
          )
        } catch (error) {
          console.error(`[Reaper] Error processing commitment ${commitment.id}:`, error)
          stats.errors.push(`${commitment.id}: ${String(error)}`)
        }
      }
    }

    console.log(`[Reaper] Processing complete. Stats:`, JSON.stringify(stats))

    // Log reaper run metrics (always recorded for business visibility)
    logBusinessEvent('reaper_run_complete', {
      processed: stats.processed,
      charged: stats.charged,
      failed: stats.failed,
      skipped: stats.skipped,
      mode: isRetryMode ? 'retry' : 'normal',
    })

    return new Response(
      JSON.stringify({
        success: true,
        mode: isRetryMode ? 'retry' : 'normal',
        stats,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Reaper] Unexpected error:', error)
    captureException(error, {
      functionName: 'process-expired-commitments',
      extra: { stats },
    })
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Process a single expired commitment
 */
async function processCommitment(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  supabaseUrl: string,
  serviceRoleKey: string,
  commitment: ExpiredCommitment,
  stats: ProcessingStats
): Promise<void> {
  console.log(`[Reaper] Processing commitment ${commitment.id}`)

  // Step 1: Mark as defaulted (optimistic lock - only if still pending)
  const { error: updateError, count } = await supabaseAdmin
    .from('commitments')
    .update({
      status: 'defaulted',
      defaulted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', commitment.id)
    .eq('status', 'pending') // Optimistic lock
    .select()

  if (updateError || count === 0) {
    console.log(`[Reaper] Commitment ${commitment.id} already processed, skipping`)
    stats.skipped++
    return
  }

  // Step 2: Check for existing charge record (idempotency)
  const { data: existingCharge } = await supabaseAdmin
    .from('penalty_charges')
    .select('id, charge_status')
    .eq('commitment_id', commitment.id)
    .single()

  if (existingCharge) {
    console.log(`[Reaper] Charge record already exists for commitment ${commitment.id}, skipping`)
    stats.skipped++
    return
  }

  // Step 3: Get user payment info
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, stripe_customer_id, stripe_payment_method_id')
    .eq('id', commitment.user_id)
    .single()

  if (userError || !user) {
    console.error(`[Reaper] User not found for commitment ${commitment.id}`)
    stats.errors.push(`${commitment.id}: User not found`)
    return
  }

  // Step 4: Get book info for notification
  const { data: book } = await supabaseAdmin
    .from('books')
    .select('id, title')
    .eq('id', commitment.book_id)
    .single()

  // Step 5: Create penalty_charge record
  const { data: chargeRecord, error: chargeError } = await supabaseAdmin
    .from('penalty_charges')
    .insert({
      commitment_id: commitment.id,
      user_id: commitment.user_id,
      amount: commitment.pledge_amount,
      currency: commitment.currency,
      stripe_customer_id: user.stripe_customer_id,
      stripe_payment_method_id: user.stripe_payment_method_id,
      charge_status: 'processing',
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (chargeError) {
    // Likely a UNIQUE constraint violation (concurrent processing)
    console.log(`[Reaper] Charge record creation failed (likely duplicate): ${chargeError.message}`)
    stats.skipped++
    return
  }

  // Step 6: Check if user has payment method
  if (!user.stripe_customer_id || !user.stripe_payment_method_id) {
    console.log(`[Reaper] No payment method for user ${user.id}`)

    await supabaseAdmin
      .from('penalty_charges')
      .update({
        charge_status: 'failed',
        failure_reason: 'No payment method on file',
        failure_code: 'MISSING_PAYMENT_METHOD',
      })
      .eq('id', chargeRecord.id)

    stats.failed++

    // Send notification about missing payment method
    await sendPushNotification(
      supabaseUrl,
      serviceRoleKey,
      user.id,
      'Commitment Expired - Payment Required',
      `Your commitment for '${book?.title || 'your book'}' expired. Please add a payment method to complete the ${formatAmount(commitment.pledge_amount, commitment.currency)} donation.`,
      { type: 'penalty_no_payment', commitment_id: commitment.id }
    )

    return
  }

  // Step 7: Attempt Stripe charge
  const chargeResult = await attemptStripeCharge(
    stripe,
    commitment.pledge_amount,
    commitment.currency,
    user.stripe_customer_id,
    user.stripe_payment_method_id,
    commitment.id,
    chargeRecord.id
  )

  // Step 8: Update charge record with result
  if (chargeResult.success) {
    await supabaseAdmin
      .from('penalty_charges')
      .update({
        charge_status: 'succeeded',
        stripe_payment_intent_id: chargeResult.stripe_payment_intent_id,
      })
      .eq('id', chargeRecord.id)

    stats.charged++

    // Send success notification
    await sendPushNotification(
      supabaseUrl,
      serviceRoleKey,
      user.id,
      'Commitment Expired - Charged',
      `Your commitment for '${book?.title || 'your book'}' expired. ${formatAmount(commitment.pledge_amount, commitment.currency)} has been charged to your card.`,
      { type: 'penalty_charged', commitment_id: commitment.id }
    )

  } else {
    // Charge failed - schedule retry
    const nextRetry = new Date()
    nextRetry.setHours(nextRetry.getHours() + 4)

    await supabaseAdmin
      .from('penalty_charges')
      .update({
        charge_status: 'failed',
        failure_reason: chargeResult.failure_reason,
        failure_code: chargeResult.failure_code,
        stripe_payment_intent_id: chargeResult.stripe_payment_intent_id,
        next_retry_at: nextRetry.toISOString(),
      })
      .eq('id', chargeRecord.id)

    stats.failed++

    // Don't send notification yet - wait for retry attempts
    console.log(`[Reaper] Charge failed for commitment ${commitment.id}: ${chargeResult.failure_reason}`)
  }
}

/**
 * Attempt to charge using Stripe PaymentIntent
 */
async function attemptStripeCharge(
  stripe: Stripe,
  amount: number,
  currency: string,
  customerId: string | null,
  paymentMethodId: string | null,
  commitmentId: string,
  chargeId: string
): Promise<ChargeResult> {
  if (!customerId || !paymentMethodId) {
    return {
      success: false,
      failure_reason: 'Missing customer or payment method',
      failure_code: 'MISSING_PAYMENT_INFO',
    }
  }

  try {
    const stripeAmount = toStripeAmount(amount, currency)
    console.log(`[Reaper] Creating PaymentIntent for ${amount} ${currency} → ${stripeAmount} (smallest unit)`)

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: stripeAmount,
        currency: currency.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          commitment_id: commitmentId,
          penalty_charge_id: chargeId,
          type: 'penalty_charge',
        },
      },
      {
        idempotencyKey: `penalty_${chargeId}`,
      }
    )

    console.log(`[Reaper] PaymentIntent status: ${paymentIntent.status}`)

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        stripe_payment_intent_id: paymentIntent.id,
      }
    } else if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        stripe_payment_intent_id: paymentIntent.id,
        failure_reason: 'Additional authentication required (3DS)',
        failure_code: 'REQUIRES_ACTION',
      }
    } else if (paymentIntent.status === 'requires_payment_method') {
      return {
        success: false,
        stripe_payment_intent_id: paymentIntent.id,
        failure_reason: 'Payment method failed',
        failure_code: 'PAYMENT_METHOD_FAILED',
      }
    }

    return {
      success: false,
      stripe_payment_intent_id: paymentIntent.id,
      failure_reason: `Unexpected status: ${paymentIntent.status}`,
      failure_code: 'UNEXPECTED_STATUS',
    }

  } catch (error: unknown) {
    const stripeError = error as { type?: string; code?: string; message?: string }
    console.error(`[Reaper] Stripe error:`, stripeError)

    // Handle specific Stripe errors
    if (stripeError.type === 'StripeCardError') {
      return {
        success: false,
        failure_reason: stripeError.message || 'Card declined',
        failure_code: stripeError.code || 'CARD_DECLINED',
      }
    }

    return {
      success: false,
      failure_reason: stripeError.message || 'Unknown Stripe error',
      failure_code: stripeError.code || 'STRIPE_ERROR',
    }
  }
}
