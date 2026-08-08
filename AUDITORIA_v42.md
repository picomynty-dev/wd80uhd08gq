# My Fit Plan v4.2 — Auditoría Monetization Sandbox

## Frontend
- Paywall Paddle Sandbox: móvil 320 / 390 y escritorio superados.
- Precio mensual y anual enlazados a sus price IDs correctos.
- `customData.mfp_user_id` enviado con cada checkout.
- El navegador no concede Premium después de `checkout.completed`.
- La app consulta Supabase hasta que el webhook actualiza el entitlement.
- Si Paddle devuelve mensual/anual invertidos, el checkout queda bloqueado.
- Perfil móvil conserva 6/6 pestañas visibles.
- Cloud Photos conserva subida/descarga.

## Webhook
- Sintaxis TypeScript validada.
- Firma HMAC-SHA256 válida: aceptada.
- Payload modificado con la misma firma: rechazado.
- `active`: Premium.
- `past_due`: mantiene Premium durante recuperación.
- `canceled`: Free.
- cancelación programada: Premium hasta `effective_at`.
- `event_id` duplicado procesado no vuelve a ejecutarse.
- evento failed/pending sí puede reintentarse.
- eventos fuera de orden se ignoran.
- Founder no puede degradarse por Paddle.
- allowlist exacta de producto/precios.

## Seguridad cliente
- 0 webhook secrets.
- 0 Supabase secret/service-role keys.
- `mfp_entitlements` sigue siendo solo lectura.
- `mfp_billing` / `mfp_billing_events` no se exponen al cliente.

## Pendiente real
No se afirma todavía que el webhook real de Paddle funcione en Supabase.
Falta desplegar la Edge Function, guardar `PADDLE_WEBHOOK_SECRET` y realizar
una compra Sandbox. Ese será el test final antes de considerar v4.2 validada.
