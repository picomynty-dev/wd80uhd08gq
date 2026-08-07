# My Fit Plan v4.1 · Premium Foundation

## Objetivo
Preparar la monetización sin activar cobros todavía y sin añadir costes.

## Planes
- Free: rutinas manuales, personalizados, biblioteca, historial básico, cuenta/cloud y fotos privadas.
- Premium: My Fit Plan adaptativo, coach avanzado, progresión automática, deload, smart replan y comparación avanzada.
- Founder: mismo acceso Premium, pensado para primeros usuarios/beta con acceso permanente.

## Seguridad del entitlement
El cliente solo puede LEER `mfp_entitlements`. No puede ponerse Premium a sí mismo.
La v4.1 respeta `premium_expires_at` y cachea el entitlement para uso offline.

## Pagos
No hay Stripe, RevenueCat ni cuotas todavía. Esta versión valida producto, paywall y bloqueos antes de conectar cobros.

## Perfil móvil
Las seis pestañas de Perfil permanecen visibles simultáneamente, sin desplazamiento horizontal.
