# My Fit Plan v4.2 — Monetization Sandbox

## Catálogo Paddle Sandbox configurado

- Producto: `pro_01kzgz375ynjkcf33d50v5xe2r`
- Mensual: `pri_01kzgz6wr16d5bg6zz2ndc3txz`
- Anual: `pri_01kzgz5v4f27r5pvhyvc5b1y59`

El client-side token Sandbox está en el frontend. Es una credencial publicable.
No hay API keys, webhook secrets ni secret/service-role keys en el cliente.

## Arquitectura

PWA → Paddle Checkout → Paddle webhook firmado → Supabase Edge Function
→ mfp_billing → mfp_entitlements → Premium.

El evento `checkout.completed` del navegador NO concede Premium. Solo hace que
la app consulte de nuevo el entitlement mientras espera al webhook.

## Webhook

Función: `paddle-webhook`

Eventos que modifican acceso:
- `subscription.created`
- `subscription.updated`

Protecciones:
- Paddle-Signature HMAC-SHA256.
- tolerancia temporal de firma,
- deduplicación por event_id,
- reintento si el evento anterior quedó failed/pending,
- protección frente a eventos fuera de orden,
- allowlist exacta de producto y price IDs,
- Founder nunca se degrada por billing.

## Antes de probar

1. Ejecutar `my-fit-plan-v42-billing-events-hardening.sql`.
2. Desplegar `paddle-webhook` con JWT verification desactivada.
3. Crear una Notification Destination en Paddle Sandbox.
4. Guardar SU secret únicamente como `PADDLE_WEBHOOK_SECRET` en Supabase.
5. Añadir `picomynty-dev.github.io` como checkout domain en Paddle Sandbox.
6. Si la cuenta de prueba sigue en Founder, devolverla a Free antes de comprar.
