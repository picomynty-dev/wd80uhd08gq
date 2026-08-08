# My Fit Plan v4.2 · Monetization Sandbox

v4.2 conecta el Premium de My Fit Plan con Paddle Sandbox manteniendo el cliente
sin permisos para concederse Premium.

## Incluye
- Checkout mensual/anual Paddle Sandbox.
- PricePreview localizado.
- Validación automática de que cada price ID tenga la periodicidad esperada.
- `customData.mfp_user_id` para vincular pago y cuenta.
- Edge Function `paddle-webhook`.
- Billing mirror en `mfp_billing`.
- Entitlement Premium actualizado únicamente desde servidor.
- Deduplicación y protección frente a eventos fuera de orden.
- Premium/Founder offline heredado de v4.1.
- Cloud y Cloud Photos conservados.
- Barra Perfil móvil 6/6 conservada.

## Importante
Esta build es SANDBOX. Solo admite pagos de prueba y no debe cambiarse a Live
hasta completar el ciclo de compra, renovación, cancelación y recuperación.
