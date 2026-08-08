# My Fit Plan v4.3 · Subscription Management Sandbox

## Novedad principal
Perfil > Cuenta muestra el estado real de la suscripción Paddle y permite abrir
el Customer Portal mediante un enlace autenticado y temporal.

## Seguridad
- La PWA nunca contiene `PADDLE_API_KEY`.
- `billing-portal` exige un JWT válido de Supabase (`auth: user`).
- El user_id se toma del JWT, nunca del body enviado por el navegador.
- `mfp_billing` sigue sin estar expuesta al cliente.
- La API key Paddle vive únicamente en Edge Function Secrets.
- Los enlaces de Customer Portal no se guardan ni se cachean.

## UX
Para Premium:
- periodicidad mensual/anual,
- estado,
- próxima renovación,
- fecha de finalización si existe cancelación programada,
- Gestionar suscripción,
- Método de pago,
- Actualizar facturación.

Founder permanece independiente de Paddle.

## Estado
La interfaz y la Edge Function han sido probadas con mocks. Falta únicamente
desplegar `billing-portal`, configurar la API key Sandbox y comprobar el portal
real con la suscripción de prueba existente.
