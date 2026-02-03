import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// Types
// ============================================================

interface GeneratePostsRequest {
  language: 'en' | 'ja'
  dry_run?: boolean
  template_name?: string // Optional: specify a template by name
  count?: number // Number of posts to generate (default: 1)
}

interface ProductContext {
  active_users: number
  total_books_completed: number
  total_donated: number
  currency: string
  days_since_launch: number
}

interface PostTemplate {
  id: string
  name: string
  category: string
  template_en: string
  template_ja: string | null
  hashtags: string[]
  media_required: boolean
  media_type: string | null
  image_prompt_hint: string | null
}

interface GeneratedPost {
  content_en: string
  content_ja: string | null
  hashtags: string[]
  media_type: string
  media_prompt: string | null
  scheduled_at: string
  language: string
  template_id: string
}

// ============================================================
// Constants
// ============================================================

const ADMIN_EMAILS = ['yoshilog.app@gmail.com']
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'

// Posting schedule (JST times)
const POSTING_SCHEDULE = {
  en: [
    { hour: 10, minute: 0 },  // 10:00 JST
    { hour: 12, minute: 0 },  // 12:00 JST
    { hour: 15, minute: 0 },  // 15:00 JST
    { hour: 18, minute: 0 },  // 18:00 JST
    { hour: 21, minute: 0 },  // 21:00 JST
    { hour: 23, minute: 0 },  // 23:00 JST - Main post
  ],
  ja: [
    { hour: 7, minute: 0 },   // 07:00 JST - Main post
  ],
}

// JST is UTC+9
const JST_OFFSET_HOURS = 9

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

function getNextScheduledTime(language: 'en' | 'ja', offsetMinutes: number = 0): Date {
  const now = new Date()
  const schedule = POSTING_SCHEDULE[language]

  // Convert current time to JST
  const nowJST = new Date(now.getTime() + JST_OFFSET_HOURS * 60 * 60 * 1000)
  const currentHour = nowJST.getUTCHours()
  const currentMinute = nowJST.getUTCMinutes()

  // Find next available slot
  for (const slot of schedule) {
    if (slot.hour > currentHour || (slot.hour === currentHour && slot.minute > currentMinute)) {
      // This slot is in the future today
      const scheduledJST = new Date(nowJST)
      scheduledJST.setUTCHours(slot.hour, slot.minute + offsetMinutes, 0, 0)
      // Convert back to UTC
      return new Date(scheduledJST.getTime() - JST_OFFSET_HOURS * 60 * 60 * 1000)
    }
  }

  // All slots passed today, schedule for tomorrow's first slot
  const tomorrowJST = new Date(nowJST)
  tomorrowJST.setUTCDate(tomorrowJST.getUTCDate() + 1)
  tomorrowJST.setUTCHours(schedule[0].hour, schedule[0].minute + offsetMinutes, 0, 0)
  return new Date(tomorrowJST.getTime() - JST_OFFSET_HOURS * 60 * 60 * 1000)
}

async function getProductContext(supabase: ReturnType<typeof createClient>): Promise<ProductContext> {
  // Get active users (users with at least one commitment in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [activeUsersResult, completedBooksResult, donationsResult] = await Promise.all([
    supabase
      .from('commitments')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('commitments')
      .select('id')
      .eq('status', 'completed'),
    supabase
      .from('donations')
      .select('amount, currency'),
  ])

  // Count unique active users
  const uniqueUsers = new Set(activeUsersResult.data?.map(c => c.user_id) || [])

  // Calculate total donated (normalize to JPY for display)
  let totalDonatedJPY = 0
  for (const donation of donationsResult.data || []) {
    if (donation.currency === 'JPY') {
      totalDonatedJPY += donation.amount
    } else if (donation.currency === 'USD') {
      totalDonatedJPY += donation.amount * 150 // Rough conversion
    }
  }

  // Calculate days since launch (assuming Jan 15, 2026 launch)
  const launchDate = new Date('2026-01-15')
  const daysSinceLaunch = Math.floor((Date.now() - launchDate.getTime()) / (24 * 60 * 60 * 1000))

  return {
    active_users: uniqueUsers.size,
    total_books_completed: completedBooksResult.data?.length || 0,
    total_donated: totalDonatedJPY,
    currency: 'JPY',
    days_since_launch: Math.max(1, daysSinceLaunch),
  }
}

async function selectTemplate(
  supabase: ReturnType<typeof createClient>,
  language: 'en' | 'ja',
  templateName?: string
): Promise<PostTemplate | null> {
  if (templateName) {
    const { data } = await supabase
      .from('post_templates')
      .select('*')
      .eq('name', templateName)
      .eq('is_active', true)
      .single()
    return data
  }

  // Select least recently used active template
  const { data: templates } = await supabase
    .from('post_templates')
    .select('*')
    .eq('is_active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(5)

  if (!templates || templates.length === 0) return null

  // Weighted random selection favoring less-used templates
  const weights = templates.map((_, i) => templates.length - i)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < templates.length; i++) {
    random -= weights[i]
    if (random <= 0) return templates[i]
  }

  return templates[0]
}

async function generatePostContent(
  template: PostTemplate,
  context: ProductContext,
  language: 'en' | 'ja',
  anthropicKey: string
): Promise<{ content: string; imagePrompt: string | null }> {
  const templateText = language === 'ja' && template.template_ja
    ? template.template_ja
    : template.template_en

  const systemPrompt = `You are a social media content creator for "Commit" - a reading commitment app.

The app works like this:
- Users pledge money (like $20 or 1000 yen) that they'll finish reading a book by a deadline
- If they succeed, they keep their money
- If they fail, the money goes to charity (Save the Children)
- Think of it as "anti-library" - making your unread books (tsundoku) into motivation

Your job is to create engaging tweets that:
1. Follow the template structure provided
2. Stay under 260 characters (leave room for hashtags)
3. Sound authentic, not corporate
4. Use concrete numbers when available
5. Build curiosity without being clickbait

Current product stats:
- Active users: ${context.active_users}
- Books completed: ${context.total_books_completed}
- Total donated to charity: ¥${context.total_donated.toLocaleString()}
- Days since launch: ${context.days_since_launch}

Language: ${language === 'ja' ? 'Japanese' : 'English'}
${language === 'ja' ? 'Write in casual Japanese, using emojis sparingly.' : 'Write in casual English.'}

IMPORTANT: Output ONLY the tweet text, nothing else. No quotes, no explanations.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Create a tweet based on this template:\n\n${templateText}\n\nRemember: Output ONLY the tweet text.`,
        },
      ],
      system: systemPrompt,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[generate-x-posts] Anthropic API error:', response.status, errorBody)
    throw new Error('External AI API request failed')
  }

  const result = await response.json()
  const content = result.content[0]?.text?.trim() || ''

  // Generate image prompt if media is required
  let imagePrompt: string | null = null
  if (template.media_required && template.media_type === 'ai_image') {
    imagePrompt = template.image_prompt_hint || `Create a minimalist, dark-themed illustration for a reading app. Style: warm amber gradients on black, luxury tech aesthetic. Theme: ${template.category}`
  }

  return { content, imagePrompt }
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
    // 1. Verify system authorization (SERVICE_ROLE or CRON_SECRET)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse(401, 'UNAUTHORIZED', 'No Authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing Supabase credentials')
    }

    if (!anthropicKey) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing Anthropic API key')
    }

    // SECURITY: CRON_SECRET must be configured for system-only endpoints
    // Without this check, empty token '' would match empty cronSecret ''
    if (!cronSecret) {
      console.error('[generate-x-posts] CRON_SECRET not configured')
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Missing CRON_SECRET')
    }

    if (!verifySystemAuthorization(authHeader, serviceRoleKey, cronSecret)) {
      console.warn('[generate-x-posts] Unauthorized access attempt')
      return errorResponse(403, 'FORBIDDEN', 'System-only endpoint')
    }

    // 2. Parse request
    let body: GeneratePostsRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid JSON body')
    }

    const { language, dry_run = false, template_name, count = 1 } = body

    if (!language || !['en', 'ja'].includes(language)) {
      return errorResponse(400, 'INVALID_LANGUAGE', 'Language must be "en" or "ja"')
    }

    if (count < 1 || count > 10) {
      return errorResponse(400, 'INVALID_COUNT', 'Count must be between 1 and 10')
    }

    // 3. Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 4. Get product context
    const context = await getProductContext(supabase)
    console.log(`[generate-x-posts] Product context:`, context)

    // 5. Generate posts
    const generatedPosts: GeneratedPost[] = []
    let offsetMinutes = 0

    for (let i = 0; i < count; i++) {
      // Select template
      const template = await selectTemplate(supabase, language, template_name)
      if (!template) {
        console.warn('[generate-x-posts] No active templates found')
        break
      }

      // Generate content
      const { content, imagePrompt } = await generatePostContent(
        template,
        context,
        language,
        anthropicKey
      )

      // Calculate scheduled time (spread posts by 30 min intervals if multiple)
      const scheduledAt = getNextScheduledTime(language, offsetMinutes)
      offsetMinutes += 30

      const post: GeneratedPost = {
        content_en: language === 'en' ? content : '',
        content_ja: language === 'ja' ? content : null,
        hashtags: template.hashtags,
        media_type: template.media_type || 'none',
        media_prompt: imagePrompt,
        scheduled_at: scheduledAt.toISOString(),
        language,
        template_id: template.id,
      }

      generatedPosts.push(post)

      // Update template usage
      if (!dry_run) {
        await supabase
          .from('post_templates')
          .update({
            use_count: template.use_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', template.id)
      }
    }

    // 6. Insert posts (if not dry run)
    if (!dry_run && generatedPosts.length > 0) {
      const postsToInsert = generatedPosts.map(post => ({
        content_en: post.content_en,
        content_ja: post.content_ja,
        hashtags: post.hashtags,
        media_type: post.media_type,
        media_prompt: post.media_prompt,
        scheduled_at: post.scheduled_at,
        language: post.language,
        template_id: post.template_id,
        status: post.media_type === 'ai_image' ? 'pending' : 'ready', // Images need generation first
      }))

      const { data: insertedPosts, error: insertError } = await supabase
        .from('scheduled_posts')
        .insert(postsToInsert)
        .select('id')

      if (insertError) {
        console.error('[generate-x-posts] Insert error:', insertError)
        return errorResponse(500, 'INSERT_FAILED', insertError.message)
      }

      // Log generation
      for (const insertedPost of insertedPosts || []) {
        await supabase.from('post_generation_logs').insert({
          scheduled_post_id: insertedPost.id,
          action: 'generation_completed',
          details: { language, template_name },
        })
      }

      console.log(`[generate-x-posts] Created ${insertedPosts?.length || 0} posts`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        posts_generated: generatedPosts.length,
        posts: generatedPosts,
        context,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[generate-x-posts] Unexpected error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', String(error))
  }
})
