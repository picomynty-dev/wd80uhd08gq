import { withSupabase } from 'npm:@supabase/server@^1'

const PADDLE_BASE_URL = 'https://sandbox-api.paddle.com'
const PHOTO_BUCKET = 'mfp-progress-photos'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

async function cancelPaddleSubscription(apiKey: string, subscriptionId: string) {
  const response = await fetch(
    `${PADDLE_BASE_URL}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Paddle-Version': '1',
      },
      body: JSON.stringify({ effective_from: 'immediately' }),
    },
  )

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    console.error('Paddle immediate cancellation failed', {
      status: response.status,
      requestId: payload?.meta?.request_id || null,
      error: payload?.error || payload,
    })
    throw new Error(`paddle_cancel_failed:${response.status}`)
  }

  return payload?.data || null
}

async function removeUserStorage(supabaseAdmin: any, userId: string) {
  const bucket = supabaseAdmin.storage.from(PHOTO_BUCKET)
  let offset = 0
  const limit = 100
  let removed = 0

  while (true) {
    const { data, error } = await bucket.list(userId, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`storage_list_failed:${error.message || 'unknown'}`)

    const entries = Array.isArray(data) ? data : []
    if (!entries.length) break

    const paths = entries
      .filter((item: any) => item?.name)
      .map((item: any) => `${userId}/${item.name}`)

    if (paths.length) {
      const { error: removeError } = await bucket.remove(paths)
      if (removeError) throw new Error(`storage_remove_failed:${removeError.message || 'unknown'}`)
      removed += paths.length
    }

    if (entries.length < limit) break
    // Como acabamos de eliminar la página actual, volvemos a offset 0.
    offset = 0
  }

  return removed
}

async function deleteRows(supabaseAdmin: any, table: string, userId: string) {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('user_id', userId)

  if (error) throw new Error(`${table}_delete_failed:${error.message || 'unknown'}`)
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
    } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    if (String(body?.confirmation || '').trim().toUpperCase() !== 'ELIMINAR') {
      return json({ error: 'confirmation_required' }, 400)
    }

    // 1) Resolver facturación antes de borrar el vínculo usuario ↔ Paddle.
    const { data: billing, error: billingError } = await ctx.supabaseAdmin
      .from('mfp_billing')
      .select('paddle_subscription_id,subscription_status')
      .eq('user_id', userId)
      .maybeSingle()

    if (billingError) {
      console.error('billing lookup failed', billingError)
      return json({ error: 'billing_lookup_failed' }, 500)
    }

    let paddleCanceled = false
    const subscriptionId = String(billing?.paddle_subscription_id || '')
    const status = String(billing?.subscription_status || '')
    const requiresCancellation = Boolean(subscriptionId)
      && !['', 'canceled'].includes(status)

    if (requiresCancellation) {
      const apiKey = Deno.env.get('PADDLE_API_KEY') || ''
      if (!apiKey) {
        return json({ error: 'paddle_api_key_not_configured' }, 503)
      }

      try {
        await cancelPaddleSubscription(apiKey, subscriptionId)
        paddleCanceled = true
      } catch (error) {
        console.error('account deletion stopped before user deletion', error)
        return json({
          error: 'billing_cancel_failed',
          message: 'No se pudo cancelar la suscripción. La cuenta no se ha eliminado.',
        }, 409)
      }
    }

    // 2) Borrar objetos Storage antes del Auth user.
    let photosRemoved = 0
    try {
      photosRemoved = await removeUserStorage(ctx.supabaseAdmin, userId)
    } catch (error) {
      console.error('storage cleanup failed', error)
      return json({ error: 'storage_cleanup_failed' }, 500)
    }

    // 3) Borrar datos de aplicación asociados.
    // Se hace explícitamente además de los ON DELETE CASCADE.
    try {
      for (const table of [
        'mfp_beta_feedback',
        'mfp_billing_events',
        'mfp_billing',
        'mfp_entitlements',
        'mfp_state',
        'mfp_profiles',
      ]) {
        await deleteRows(ctx.supabaseAdmin, table, userId)
      }
    } catch (error) {
      console.error('database cleanup failed', error)
      return json({ error: 'database_cleanup_failed' }, 500)
    }

    // 4) Eliminar realmente el usuario de Supabase Auth.
    const { error: authError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('auth user deletion failed', authError)
      return json({ error: 'auth_delete_failed' }, 500)
    }

    return json({
      ok: true,
      deleted: true,
      paddleCanceled,
      photosRemoved,
    })
  }),
}
