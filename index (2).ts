import { withSupabase } from 'npm:@supabase/server@^1'

const PADDLE_BASE_URL = 'https://sandbox-api.paddle.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function cadenceForPrice(priceId: string) {
  if (priceId === 'pri_01kzgz5v4f27r5pvhyvc5b1y59') return 'monthly'
  if (priceId === 'pri_01kzgz6wr16d5bg6zz2ndc3txz') return 'annual'
  return 'unknown'
}

function pickPortalUrl(data: any, subscriptionId: string, target: string) {
  const urls = data?.urls || {}
  const general = urls?.general || {}

  if (target === 'overview') {
    return general?.overview || ''
  }

  const subscriptions = Array.isArray(urls?.subscriptions)
    ? urls.subscriptions
    : Object.values(urls?.subscriptions || {})

  const match = subscriptions.find((item: any) => item?.id === subscriptionId)
    || subscriptions[0]
    || null

  if (!match) return general?.overview || ''

  if (target === 'cancel') {
    return match?.cancel_subscription || general?.overview || ''
  }
  if (target === 'payment') {
    return match?.update_subscription_payment_method || general?.overview || ''
  }
  return general?.overview || ''
}

async function createPortalSession(
  apiKey: string,
  customerId: string,
  subscriptionId: string,
) {
  const response = await fetch(
    `${PADDLE_BASE_URL}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Paddle-Version': '1',
      },
      body: JSON.stringify({
        subscription_ids: subscriptionId ? [subscriptionId] : [],
      }),
    },
  )

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    console.error('Paddle portal session failed', {
      status: response.status,
      requestId: payload?.meta?.request_id || null,
      error: payload?.error || payload,
    })
    throw new Error('paddle_portal_session_failed')
  }

  return payload?.data || null
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405)
    }

    const userId = String(ctx.userClaims?.sub || ctx.userClaims?.id || '')
    if (!userId) return json({ error: 'unauthorized' }, 401)

    let body: any = {}
    try {
      body = await request.json()
    } catch {}

    const action = String(body?.action || 'summary')
    const target = String(body?.target || 'overview')

    const { data: billing, error: billingError } = await ctx.supabaseAdmin
      .from('mfp_billing')
      .select(`
        provider,
        paddle_customer_id,
        paddle_subscription_id,
        paddle_product_id,
        paddle_price_id,
        subscription_status,
        current_period_end,
        scheduled_change_action,
        scheduled_change_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle()

    if (billingError) {
      console.error('Billing summary failed', billingError)
      return json({ error: 'billing_lookup_failed' }, 500)
    }

    const safeBilling = billing
      ? {
          provider: billing.provider,
          cadence: cadenceForPrice(String(billing.paddle_price_id || '')),
          status: billing.subscription_status || 'unknown',
          currentPeriodEnd: billing.current_period_end || null,
          scheduledChangeAction: billing.scheduled_change_action || null,
          scheduledChangeAt: billing.scheduled_change_at || null,
          hasPortal: Boolean(
            billing.paddle_customer_id && billing.paddle_subscription_id
          ),
          updatedAt: billing.updated_at || null,
        }
      : {
          provider: 'paddle',
          cadence: 'none',
          status: 'none',
          currentPeriodEnd: null,
          scheduledChangeAction: null,
          scheduledChangeAt: null,
          hasPortal: false,
          updatedAt: null,
        }

    if (action === 'summary') {
      return json({ ok: true, billing: safeBilling })
    }

    if (action !== 'portal') {
      return json({ error: 'invalid_action' }, 400)
    }

    if (!billing?.paddle_customer_id || !billing?.paddle_subscription_id) {
      return json({ error: 'subscription_not_found' }, 404)
    }

    if (!['overview', 'cancel', 'payment'].includes(target)) {
      return json({ error: 'invalid_portal_target' }, 400)
    }

    const apiKey = Deno.env.get('PADDLE_API_KEY') || ''
    if (!apiKey) {
      return json({ error: 'paddle_api_key_not_configured' }, 503)
    }

    try {
      const session = await createPortalSession(
        apiKey,
        billing.paddle_customer_id,
        billing.paddle_subscription_id,
      )

      const url = pickPortalUrl(
        session,
        billing.paddle_subscription_id,
        target,
      )

      if (!url) return json({ error: 'portal_url_missing' }, 502)

      // El token de portal es temporal. No se guarda en base de datos.
      return json({ ok: true, url, target })
    } catch (error) {
      console.error('Billing portal failed', error)
      return json({ error: 'billing_portal_failed' }, 502)
    }
  }),
}
