# My Fit Plan v4.7 — Auditoría External Beta Candidate

## Objetivo
Preparar la v4.6 estable para una beta externa controlada sin activar cobros reales.

## Cambios
- Identidad legal y correo completados.
- Dirección postal añadida como bloqueo explícito pendiente.
- Aviso de privacidad ampliado.
- Consentimiento separado de datos de progreso físico.
- Versión, cache y configuración remota actualizados a 4.7.

## Seguridad de lanzamiento
- Paddle permanece en Sandbox.
- `externalDistributionAllowed=false`.
- No se añaden secretos al frontend.
- No requiere SQL nuevo.
- No requiere desplegar Edge Functions nuevas.

## Regresión prevista
Los motores de entrenamiento, progresión, selección de sesión, calendario, biblioteca, Premium y sincronización mantienen la misma lógica que v4.6; solo se actualizan referencias de caché/versionado donde procede.

## Estado
Candidata técnica preparada para validación del propietario. No abrir todavía a testers externos hasta completar el contacto postal y superar la prueba publicada.
