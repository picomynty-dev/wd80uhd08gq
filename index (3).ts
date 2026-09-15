import { withSupabase } from 'npm:@supabase/server@^1'

const encoder = new TextEncoder()

const PREMIUM_PRODUCT_ID = 'pro_01kzgz375ynjkcf33d50v5xe2r'
const ALLOWED_PRICE_IDS = new Set([
  'pri_01kzgz6wr16d5bg6zz2ndc3txz',
  'pri_01kzgz5v4f27r5pvhyvc5b1y59',
])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return result === 0
}

async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
) {
  const parts = signatureHeader.split(';').map((part) => part.trim())
  const timestamp = parts.find((part) => part.startsWith('ts='))?.slice(3) || ''
  const signatures = parts
    .filter((part) => part.startsWith('h1='))
    .map((part) => part.slice(3))
    .filter(Boolean)

  if (!timestamp || !signatures.length) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > 5) return false

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signedPayload = `${timestamp}:${rawBody}`
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const expected = hex(digest)

  return signatures.some((candidate) => constantTimeEqual(expected, candidate))
}

function validUuid(value: unknown) {
  const text = String(value || '')
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

function subscriptionItem(data: any) {
  const items = Array.isArray(data?.items) ? data.items : []
  return items.find((item) => item?.price?.billing_cycle || item?.price?.billingCycle)
    || items[0]
    || null
}

function accessForSubscription(data: any) {
  const status = String(data?.status || '').toLowerCase()
  const scheduled = data?.scheduled_change || null
  const action = String(scheduled?.action || '').toLowerCase()
  const effectiveAt = scheduled?.effective_at || null

  if (!['active', 'trialing', 'past_due'].includes(status)) {
    return { plan: 'free', expiresAt: null }
  }

  if (['cancel', 'pause'].includes(action) && effectiveAt) {
    return { plan: 'premium', expiresAt: effectiveAt }
  }

  return { plan: 'premium', expiresAt: null }
}

async function markEventFailed(supabaseAdmin: any, eventId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'unknown_error')
  await supabaseAdmin
    .from('mfp_billing_events')
    .update({
      processing_status: 'failed',
      last_error: message.slice(0, 2000),
      processed_at: null,
    })
    .eq('event_id', eventId)
}

async function processSubscriptionEvent(
  supabaseAdmin: any,
  event: any,
  eventId: string,
  occurredAt: string | null,
) {
  const data = event?.data || {}
  const userId = validUuid(data?.custom_data?.mfp_user_id)

  if (!userId) throw new Error('subscription_missing_valid_mfp_user_id')

  // Una cancelación inmediata durante "Eliminar cuenta" puede generar
  // subscription.updated después de que el usuario ya haya sido borrado.
  // En ese caso respondemos 200 y no recreamos billing/entitlements.
  const { data: authLookup, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authLookupError || !authLookup?.user) {
    await supabaseAdmin
      .from('mfp_billing_events')
      .update({
        processing_status: 'processed',
        last_error: 'ignored_deleted_user',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)

    return { ignored: 'deleted_user', userId }
  }

  const item = subscriptionItem(data)
  const priceId = String(item?.price?.id || item?.price_id || '')
  const productId = String(
    item?.price?.product_id
    || item?.price?.productId
    || item?.product?.id
    || ''
  )

  if (!ALLOWED_PRICE_IDS.has(priceId)) {
    throw new Error(`unapproved_price:${priceId || 'missing'}`)
  }
  if (productId && productId !== PREMIUM_PRODUCT_ID) {
    throw new Error(`unapproved_product:${productId}`)
  }

  const { data: existingBilling, error: existingError } = await supabaseAdmin
    .from('mfp_billing')
    .select('last_event_occurred_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw existingError

  const previousOccurredAt = existingBilling?.last_event_occurred_at
  if (
    previousOccurredAt
    && occurredAt
    && Date.parse(occurredAt) < Date.parse(previousOccurredAt)
  ) {
    await supabaseAdmin
      .from('mfp_billing_events')
      .update({
        user_id: userId,
        processing_status: 'processed',
        last_error: 'ignored_out_of_order',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)

    return { ignored: 'out_of_order', userId }
  }

  const scheduled = data?.scheduled_change || null
  const access = accessForSubscription(data)

  const { error: billingError } = await supabaseAdmin
    .from('mfp_billing')
    .upsert({
      user_id: userId,
      provider: 'paddle',
      paddle_customer_id: data?.customer_id || null,
      paddle_subscription_id: data?.id || null,
      paddle_product_id: productId || PREMIUM_PRODUCT_ID,
      paddle_price_id: priceId,
      subscription_status: String(data?.status || '') || null,
      current_period_end: data?.current_billing_period?.ends_at || null,
      scheduled_change_action: scheduled?.action || null,
      scheduled_change_at: scheduled?.effective_at || null,
      last_event_id: eventId,
      last_event_occurred_at: occurredAt,
    }, { onConflict: 'user_id' })

  if (billingError) throw billingError

  const { data: entitlement, error: entitlementReadError } = await supabaseAdmin
    .from('mfp_entitlements')
    .select('plan')
    .eq('user_id', userId)
    .maybeSingle()

  if (entitlementReadError) throw entitlementReadError

  if (entitlement?.plan !== 'founder') {
    const { error: entitlementError } = await supabaseAdmin
      .from('mfp_entitlements')
      .upsert({
        user_id: userId,
        plan: access.plan,
        source: 'paddle',
        premium_expires_at: access.expiresAt,
      }, { onConflict: 'user_id' })

    if (entitlementError) throw entitlementError
  }

  const { error: processedError } = await supabaseAdmin
    .from('mfp_billing_events')
    .update({
      user_id: userId,
      processing_status: 'processed',
      last_error: null,
      processed_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)

  if (processedError) throw processedError

  return {
    userId,
    plan: entitlement?.plan === 'founder' ? 'founder' : access.plan,
  }
}

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, ctx) => {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const webhookSecret = Deno.env.get('PADDLE_WEBHOOK_SECRET') || ''
    if (!webhookSecret) {
      console.error('PADDLE_WEBHOOK_SECRET is not configured')
      return json({ error: 'server_not_configured' }, 500)
    }

    const rawBody = await request.text()
    const signature = request.headers.get('Paddle-Signature') || ''

    if (!await verifyPaddleSignature(rawBody, signature, webhookSecret)) {
      return json({ error: 'invalid_signature' }, 401)
    }

    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    const eventId = String(event?.event_id || '')
    const eventType = String(event?.event_type || '')
    const occurredAt = event?.occurred_at || null

    if (!eventId || !eventType) return json({ error: 'invalid_event' }, 400)

    const { error: insertError } = await ctx.supabaseAdmin
      .from('mfp_billing_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        occurred_at: occurredAt,
        processing_status: 'pending',
        processed_at: null,
        last_error: null,
      })

    if (insertError && insertError.code !== '23505') {
      console.error('billing event insert failed', insertError)
      return json({ error: 'event_log_failed' }, 500)
    }

    if (insertError?.code === '23505') {
      const { data: prior, error: priorError } = await ctx.supabaseAdmin
        .from('mfp_billing_events')
        .select('processing_status')
        .eq('event_id', eventId)
        .maybeSingle()

      if (priorError) return json({ error: 'event_lookup_failed' }, 500)
      if (prior?.processing_status === 'processed') {
        return json({ ok: true, duplicate: true })
      }
    }

    if (!['subscription.created', 'subscription.updated'].includes(eventType)) {
      await ctx.supabaseAdmin
        .from('mfp_billing_events')
        .update({
          processing_status: 'processed',
          last_error: 'ignored_event_type',
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)

      return json({ ok: true, ignored: eventType })
    }

    try {
      const result = await processSubscriptionEvent(
        ctx.supabaseAdmin,
        event,
        eventId,
        occurredAt,
      )
      return json({ ok: true, event: eventType, ...result })
    } catch (error) {
      console.error('Paddle subscription processing failed', error)
      await markEventFailed(ctx.supabaseAdmin, eventId, error)
      return json({ error: 'processing_failed' }, 500)
    }
  }),
}
