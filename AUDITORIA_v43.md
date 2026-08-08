# My Fit Plan v4.3 — Auditoría Subscription Management

## Funcionalidad
- Estado de suscripción en Perfil → Cuenta.
- Periodicidad mensual/anual.
- Estado Paddle.
- Renovación o fecha de finalización.
- Cancelación programada explicada.
- Gestionar suscripción.
- Actualizar método de pago.
- Founder separado de Paddle.

## Seguridad
- `billing-portal` exige usuario autenticado.
- `verify_jwt = true`.
- El user_id se toma del JWT.
- El navegador no puede indicar qué user_id consultar.
- `mfp_billing` continúa sin permisos de cliente.
- La Paddle API key solo se lee de `PADDLE_API_KEY` en Edge Functions.
- El frontend contiene 0 API keys secretas.
- Los enlaces autenticados de Paddle no se almacenan ni cachean.

## Pruebas
- Resumen seguro de billing: superado.
- Fecha de cancelación: superado.
- Customer/subscription IDs no expuestos: superado.
- Creación de portal session simulada: superado.
- Deep link de método de pago: superado.
- API key ausente: bloqueada.
- UI móvil 320 px: superado.
- UI móvil 390 px: superado.
- UI escritorio: superado.
- Barra Perfil: 6/6.
- Sin overflow horizontal.

## Pendiente
Falta desplegar `billing-portal`, guardar la API key Sandbox en Supabase y
comprobar un Customer Portal Session real contra Paddle. No se da ese paso por
validado hasta probarlo en la cuenta Sandbox del proyecto.
