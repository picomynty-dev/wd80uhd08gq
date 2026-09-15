import { withSupabase } from 'npm:@supabase/server@^1'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function safeDiagnostics(value: any) {
  if (!value || typeof value !== 'object') return null

  const issues = Array.isArray(value.runtimeIssues)
    ? value.runtimeIssues.slice(0, 3).map((item: any) => ({
        context: String(item?.context || '').slice(0, 100),
        message: String(item?.message || '').slice(0, 500),
        createdAt: item?.createdAt || null,
      }))
    : []

  return {
    appVersion: String(value.appVersion || '').slice(0, 80),
    view: String(value.view || '').slice(0, 60),
    online: Boolean(value.online),
    plan: String(value.plan || '').slice(0, 20),
    cloudSync: String(value.cloudSync || '').slice(0, 30),
    viewport: value.viewport && typeof value.viewport === 'object'
      ? {
          width: Math.max(0, Math.min(10000, Number(value.viewport.width || 0))),
          height: Math.max(0, Math.min(10000, Number(value.viewport.height || 0))),
          mode: String(value.viewport.mode || '').slice(0, 30),
        }
      : null,
    runtimeIssues: issues,
  }
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

    const kind = ['bug','idea','experience'].includes(String(body?.kind))
      ? String(body.kind)
      : 'experience'
    const message = String(body?.message || '').trim()

    if (message.length < 10 || message.length > 2000) {
      return json({ error: 'invalid_message' }, 400)
    }

    const diagnostics = safeDiagnostics(body?.diagnostics)

    const { data, error } = await ctx.supabaseAdmin
      .from('mfp_beta_feedback')
      .insert({
        user_id: userId,
        kind,
        message,
        app_version: String(diagnostics?.appVersion || '').slice(0, 80),
        screen: String(diagnostics?.view || '').slice(0, 60),
        diagnostics,
      })
      .select('id,created_at')
      .single()

    if (error) {
      console.error('beta-feedback insert failed', error)
      return json({ error: 'feedback_store_failed' }, 500)
    }

    return json({
      ok: true,
      feedbackId: data?.id || null,
      createdAt: data?.created_at || null,
    })
  }),
}
