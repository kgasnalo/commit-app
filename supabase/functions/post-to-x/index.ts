import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
// Note: Using Web Crypto API (crypto.subtle) for HMAC operations

// ============================================================
// Types
// ============================================================

interface PostToXRequest {
  scheduled_post_id?: string // Process specific post
  batch_size?: number // Process multiple ready posts (default: 5)
}

interface ScheduledPost {
  id: string
  content_en: string
  content_ja: string | null
  hashtags: string[]
  media_type: string
  media_url: string | null
  language: string
  status: string
  attempt_count: number
}

// ============================================================
// Constants
// ============================================================

const X_API_BASE = 'https://api.twitter.com'
const X_UPLOAD_API_BASE = 'https://upload.twitter.com'
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MINUTES = 30

// ============================================================
// OAuth 1.0a Helper Functions
// ============================================================

/**
 * Generate cryptographically secure nonce for OAuth 1.0a
 * Uses Web Crypto API instead of Math.random() for security
 */
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  // Sort parameters and create parameter string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&')

  // Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`

  // Generate HMAC-SHA1 signature
  const encoder = new TextEncoder()
  const keyData = encoder.encode(signingKey)
  const messageData = encoder.encode(signatureBaseString)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

function generateOAuthHeader(
  oauthParams: Record<string, string>
): string {
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

// ============================================================
// X API Functions
// ============================================================

async function uploadMedia(
  mediaUrl: string,
  credentials: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
  }
): Promise<string> {
  // Download image from URL
  const imageResponse = await fetch(mediaUrl)
  if (!imageResponse.ok) {
    console.error('[post-to-x] Failed to download image:', imageResponse.status)
    throw new Error('Media download failed')
  }
  const imageBlob = await imageResponse.blob()
  const imageBase64 = btoa(
    String.fromCharCode(...new Uint8Array(await imageBlob.arrayBuffer()))
  )

  // Upload to X
  const uploadUrl = `${X_UPLOAD_API_BASE}/1.1/media/upload.json`

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = generateNonce()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  }

  // For media upload, we need to include media_data in signature
  const allParams = { ...oauthParams, media_data: imageBase64 }

  const signature = await generateOAuthSignature(
    'POST',
    uploadUrl,
    allParams,
    credentials.apiSecret,
    credentials.accessTokenSecret
  )

  oauthParams.oauth_signature = signature

  const formData = new FormData()
  formData.append('media_data', imageBase64)

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: generateOAuthHeader(oauthParams),
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[post-to-x] Media upload failed:', response.status, errorBody)
    throw new Error('Media upload to X failed')
  }

  const result = await response.json()
  return result.media_id_string
}

async function postTweet(
  text: string,
  mediaId: string | null,
  credentials: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessTokenSecret: string
  }
): Promise<string> {
  const tweetUrl = `${X_API_BASE}/2/tweets`

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = generateNonce()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  }

  const signature = await generateOAuthSignature(
    'POST',
    tweetUrl,
    oauthParams,
    credentials.apiSecret,
    credentials.accessTokenSecret
  )

  oauthParams.oauth_signature = signature

  // Build tweet payload
  const tweetPayload: { text: string; media?: { media_ids: string[] } } = {
    text,
  }

  if (mediaId) {
    tweetPayload.media = { media_ids: [mediaId] }
  }

  const response = await fetch(tweetUrl, {
    method: 'POST',
    headers: {
      Authorization: generateOAuthHeader(oauthParams),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetPayload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[post-to-x] Tweet failed:', response.status, errorBody)
    throw new Error('Tweet posting failed')
  }

  const result = await response.json()
  return result.data.id
}

// ============================================================
// Helper Functions
// ============================================================

function errorResponse(status: number, errorCode: string, details?: string) {
  return new Response(
    JSON.stringify({ success: false, error: errorCode, details }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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

function verifySystemAuthorization(authHeader: string, serviceRoleKey: string, cronSecret: string): boolean {
  const token = authHeader.replace('Bearer ', '').trim()
  return timingSafeEqual(token, serviceRoleKey) || timingSafeEqual(token, cronSecret)
}

function formatTweetContent(post: ScheduledPost): string {
  const content = post.language === 'ja' && post.content_ja
    ? post.content_ja
    : post.content_en

  // Add hashtags if there's room
  const hashtags = post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')
  const fullContent = `${content}\n\n${hashtags}`

  // X character limit is 280
  if (fullContent.length <= 280) {
    return fullContent
  }

  // Try without hashtags
  if (content.length <= 280) {
    return content
  }

  // Truncate content
  return content.substring(0, 277) + '...'
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
    // 1. Verify system authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse(401, 'UNAUTHORIZED', 'No Authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const cronSecret = Deno.env.get('CRON_SECRET') || ''

    // X API credentials
    const xApiKey = Deno.env.get('X_API_KEY')
    const xApiSecret = Deno.env.get('X_API_SECRET')
    const xAccessToken = Deno.env.get('X_ACCESS_TOKEN')
    const xAccessTokenSecret = Deno.env.get('X_ACCESS_TOKEN_SECRET')

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing Supabase credentials')
    }

    if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing X API credentials')
    }

    if (!verifySystemAuthorization(authHeader, serviceRoleKey, cronSecret)) {
      console.warn('[post-to-x] Unauthorized access attempt')
      return errorResponse(403, 'FORBIDDEN', 'System-only endpoint')
    }

    // 2. Parse request
    let body: PostToXRequest = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is OK
    }

    const { scheduled_post_id, batch_size = 5 } = body

    // 3. Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 4. Get posts ready to be posted
    const now = new Date().toISOString()

    let query = supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'ready')
      .lte('scheduled_at', now)
      .lt('attempt_count', MAX_RETRY_ATTEMPTS)
      .order('scheduled_at', { ascending: true })

    if (scheduled_post_id) {
      query = supabase
        .from('scheduled_posts')
        .select('*')
        .eq('id', scheduled_post_id)
        .single()
    } else {
      query = query.limit(batch_size)
    }

    const { data: posts, error: fetchError } = await query

    if (fetchError) {
      console.error('[post-to-x] Fetch error:', fetchError)
      return errorResponse(500, 'FETCH_FAILED')
    }

    const postsToProcess: ScheduledPost[] = scheduled_post_id ? [posts as ScheduledPost] : (posts as ScheduledPost[] || [])

    if (postsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No posts ready to publish', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[post-to-x] Processing ${postsToProcess.length} posts`)

    const credentials = {
      apiKey: xApiKey,
      apiSecret: xApiSecret,
      accessToken: xAccessToken,
      accessTokenSecret: xAccessTokenSecret,
    }

    // 5. Process each post
    const results: { id: string; success: boolean; x_post_id?: string; error?: string }[] = []

    for (const post of postsToProcess) {
      try {
        // Update status to processing
        await supabase
          .from('scheduled_posts')
          .update({ status: 'processing' })
          .eq('id', post.id)

        // Log start
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: post.id,
          action: 'post_started',
        })

        // Upload media if present
        let mediaId: string | null = null
        if (post.media_url && post.media_type !== 'none') {
          console.log(`[post-to-x] Uploading media for post ${post.id}`)
          mediaId = await uploadMedia(post.media_url, credentials)
        }

        // Format tweet content
        const tweetContent = formatTweetContent(post)
        console.log(`[post-to-x] Posting tweet for post ${post.id}: "${tweetContent.substring(0, 50)}..."`)

        // Post tweet
        const xPostId = await postTweet(tweetContent, mediaId, credentials)

        // Update post as successful
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            x_post_id: xPostId,
          })
          .eq('id', post.id)

        // Log success
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: post.id,
          action: 'post_completed',
          details: { x_post_id: xPostId },
        })

        console.log(`[post-to-x] Successfully posted: ${xPostId}`)
        results.push({ id: post.id, success: true, x_post_id: xPostId })

      } catch (error) {
        console.error(`[post-to-x] Error posting ${post.id}:`, error)

        const newAttemptCount = (post.attempt_count || 0) + 1
        const newStatus = newAttemptCount >= MAX_RETRY_ATTEMPTS ? 'failed' : 'ready'

        // Update post with error
        await supabase
          .from('scheduled_posts')
          .update({
            status: newStatus,
            last_error: String(error),
            attempt_count: newAttemptCount,
            // If retrying, push scheduled_at back
            ...(newStatus === 'ready' ? {
              scheduled_at: new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000).toISOString()
            } : {}),
          })
          .eq('id', post.id)

        // Log failure
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: post.id,
          action: newStatus === 'failed' ? 'post_failed' : 'retry_scheduled',
          details: {
            error: String(error),
            attempt_count: newAttemptCount,
            next_retry: newStatus === 'ready'
              ? new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000).toISOString()
              : null,
          },
        })

        results.push({ id: post.id, success: false, error: String(error) })
      }
    }

    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded: successCount,
        failed: results.length - successCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[post-to-x] Unexpected error:', error)
    return errorResponse(500, 'INTERNAL_ERROR')
  }
})
