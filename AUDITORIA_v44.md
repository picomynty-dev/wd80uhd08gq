# My Fit Plan v4.4 — Auditoría Beta Ready

## Resultado técnico

- 29 módulos JavaScript sin errores de sintaxis.
- 4 Edge Functions sin errores de sintaxis.
- 121/121 acciones UI con handler.
- 10 acciones Premium protegidas y matriz Free/Premium preservada.
- 0 secretos de Paddle/Supabase encontrados en frontend.
- Service Worker v4.4 con `version.json` siempre consultado por red.
- Perfil móvil probado a 320 px y 390 px, además de escritorio.
- 6/6 pestañas de Perfil visibles y sin overflow horizontal.

## v4.4

- Año completo en fechas Premium y facturación.
- Feedback Beta autenticado.
- Privacidad y Términos integrados como borrador.
- Estado claro si Paddle/Supabase no responden.
- Reconexión Cloud manual y automática.
- Sesión Cloud/Premium cacheado preservados sin conexión.
- Detector de versión nueva independiente del Service Worker.
- Eliminación de cuenta con confirmación escrita.
- Cancelación inmediata Paddle antes de borrar una cuenta Premium.
- Limpieza de fotografías, tablas y Supabase Auth.
- Webhook preparado para ignorar con HTTP 200 eventos tardíos de una cuenta ya eliminada.

## Validación ejecutada

- Unit tests servidor: superados.
- Account-delete: confirmación, cancelación Paddle, Storage, DB y Auth: superado con mocks.
- Si Paddle no cancela, el borrado se detiene: superado.
- Beta feedback: validación y saneado de diagnóstico: superado.
- Evento Paddle tardío de usuario borrado: 200/ignorado: superado.
- UI móvil 320/390 y desktop: superado.
- Año 2026 visible en Premium/facturación: superado.
- Feedback desde UI: superado con backend simulado.
- Sesión expirada offline no expulsa al usuario: superado.
- Premium cacheado offline permanece accesible: superado.
- Detección de una versión 4.5 desde `version.json`: superado.

## Pendiente antes de llamar a esto beta pública

1. Completar responsable y correo de privacidad/contacto.
2. Ejecutar el SQL de `mfp_beta_feedback`.
3. Añadir permiso `subscription.write` a la API key Sandbox usada por `PADDLE_API_KEY`.
4. Desplegar `account-delete` y `beta-feedback`.
5. Redeplegar `paddle-webhook` v4.4.
6. Enviar un feedback real y comprobar la fila en Supabase.
7. Probar eliminación real únicamente con una cuenta desechable.

La compilación es **Beta Ready técnica**, pero el lanzamiento público queda bloqueado de forma intencionada mientras falten los datos legales reales y las pruebas finales de servidor.
