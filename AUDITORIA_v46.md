# My Fit Plan v4.6 — Auditoría Beta Pilot

## Objetivo
Preparar una cohorte piloto controlada sin activar cobros reales ni modificar los motores de entrenamiento.

## Beta Pilot
- Configuración remota mediante `beta-config.json`.
- Welcome del piloto una sola vez por cuenta.
- Guía del tester.
- Checklist de 4 pasos:
  1. cuenta conectada,
  2. perfil preparado,
  3. entrenamiento completado desde el inicio del piloto,
  4. feedback enviado.
- Botón flotante de feedback fuera de la pantalla de entrenamiento.
- El feedback continúa usando la Edge Function `beta-feedback` ya validada.
- Control remoto de `pilotOpen`, `maintenance`, `minimumVersion` y `feedbackEnabled`.
- Distribución externa permanece bloqueada.

## Regresión
- 12/12 motores principales comparados con v4.5: sin cambios lógicos.
- 124/124 acciones UI con handler.
- 10/10 acciones Premium preservadas.
- 0 secretos servidor en frontend.
- No requiere SQL nuevo.
- No requiere cambios de Paddle.
- No requiere desplegar Edge Functions nuevas.

## Pruebas
- Welcome una sola vez: superado.
- Config remota: superado.
- Checklist inicial 3/4: superado.
- Feedback real simulado contra la Edge Function existente: superado.
- Checklist tras feedback 4/4: superado.
- Móvil 390 px sin overflow: superado.
- Card Beta Pilot en escritorio: superado.
- Feedback flotante oculto durante entrenamiento: superado.
- Barra de sesión real preservada: superado.

## Bloqueo de lanzamiento
La v4.6 está preparada para **piloto interno**. No se considera lista para distribución externa mientras `js/legal.js` no tenga responsable y correo reales. `beta-config.json` mantiene `externalDistributionAllowed: false`.
