import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// Types
// ============================================================

interface GenerateImageRequest {
  scheduled_post_id?: string // Process specific post
  batch_size?: number // Process multiple pending posts (default: 5)
}

// ============================================================
// Constants
// ============================================================

const DALLE_MODEL = 'dall-e-3'
const IMAGE_SIZE = '1024x1024'
const TITAN_DESIGN_PROMPT_PREFIX = `Style: Dark luxury tech aesthetic.
Background: Deep black with warm amber/orange gradients.
Mood: Premium, minimal, sophisticated.
Colors: Black (#0A0A0A), warm orange (#FF6B35), amber highlights.
No text in the image.

`

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

async function generateImage(prompt: string, openaiKey: string): Promise<string> {
  const fullPrompt = TITAN_DESIGN_PROMPT_PREFIX + prompt

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: DALLE_MODEL,
      prompt: fullPrompt,
      n: 1,
      size: IMAGE_SIZE,
      response_format: 'b64_json',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[generate-post-image] DALL-E API error:', response.status, errorBody)
    throw new Error('Image generation API request failed')
  }

  const result = await response.json()
  return result.data[0].b64_json
}

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  base64Image: string,
  postId: string
): Promise<string> {
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Image)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const fileName = `posts/${postId}_${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('marketing-assets')
    .upload(fileName, bytes, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Storage upload error: ${uploadError.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('marketing-assets')
    .getPublicUrl(fileName)

  return publicUrl
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing Supabase credentials')
    }

    if (!openaiKey) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing OpenAI API key')
    }

    if (!verifySystemAuthorization(authHeader, serviceRoleKey, cronSecret)) {
      console.warn('[generate-post-image] Unauthorized access attempt')
      return errorResponse(403, 'FORBIDDEN', 'System-only endpoint')
    }

    // 2. Parse request
    let body: GenerateImageRequest = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is OK - will process pending posts
    }

    const { scheduled_post_id, batch_size = 5 } = body

    // 3. Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 4. Get posts that need image generation
    let query = supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .eq('media_type', 'ai_image')
      .not('media_prompt', 'is', null)
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
      console.error('[generate-post-image] Fetch error:', fetchError)
      return errorResponse(500, 'FETCH_FAILED')
    }

    const postsToProcess = scheduled_post_id ? [posts] : (posts || [])

    if (postsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No posts need image generation', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[generate-post-image] Processing ${postsToProcess.length} posts`)

    // 5. Process each post
    const results: { id: string; success: boolean; error?: string }[] = []

    for (const post of postsToProcess) {
      try {
        // Update status to generating_image
        await supabase
          .from('scheduled_posts')
          .update({ status: 'generating_image' })
          .eq('id', post.id)

        // Log start
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: post.id,
          action: 'image_generation_started',
          details: { prompt: post.media_prompt },
        })

        // Generate image
        console.log(`[generate-post-image] Generating image for post ${post.id}`)
        const base64Image = await generateImage(post.media_prompt, openaiKey)

        // Upload to storage
        const imageUrl = await uploadToStorage(supabase, base64Image, post.id)
        console.log(`[generate-post-image] Uploaded image: ${imageUrl}`)

        // Update post with image URL and set status to ready
        await supabase
          .from('scheduled_posts')
          .update({
            media_url: imageUrl,
            status: 'ready',
          })
          .eq('id', post.id)

        // Log success
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: post.id,
          action: 'image_generation_completed',
          details: { image_url: imageUrl },
        })

        results.push({ id: post.id, success: true })

      } catch (error) {
        console.error(`[generate-post-image] Error processing post ${post.id}:`, error)

        // Update status back to pending for retry
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'pending',
            last_error: String(error),
            attempt_count: (post.attempt_count || 0) + 1,
          })
          .eq('id', post.id)

        // Log failure
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: post.id,
          action: 'image_generation_failed',
          details: { error: String(error) },
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
    console.error('[generate-post-image] Unexpected error:', error)
    return errorResponse(500, 'INTERNAL_ERROR')
  }
})
