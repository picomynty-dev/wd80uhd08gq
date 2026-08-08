# My Fit Plan v4.4 · Beta Ready Sandbox

## Estado

v4.4 prepara My Fit Plan para una beta controlada manteniendo Paddle en Sandbox.
No activa cobros reales.

## Novedades

- Fechas Premium/facturación con año.
- Feedback Beta autenticado y guardado en Supabase.
- Centro de Privacidad y Términos en la app.
- Eliminación robusta de cuenta:
  1. cancelación inmediata de suscripción Sandbox si existe,
  2. limpieza de fotografías privadas,
  3. limpieza de datos de aplicación,
  4. eliminación de Supabase Auth.
- Sesiones Cloud más resistentes cuando se pierde internet.
- Estado claro si Paddle/Supabase no están disponibles.
- Detector de versiones mediante `version.json`.
- Matriz Free/Premium preservada.

## Seguridad

- `account-delete` y `beta-feedback` exigen JWT de usuario.
- El user_id se obtiene del JWT, no del body.
- `PADDLE_API_KEY` nunca aparece en frontend.
- La API key se lee únicamente desde Supabase Edge Function Secrets.
- El webhook de Paddle sigue autenticándose mediante `Paddle-Signature`.
- `mfp_beta_feedback` no concede acceso directo a `anon` ni `authenticated`.

## Pendiente antes de beta pública

La compilación está lista técnicamente, pero los documentos legales contienen un
bloqueo intencionado hasta completar el responsable real del tratamiento y un
correo de contacto/privacidad.

También hay que completar el despliegue servidor indicado en
`PASOS_SERVIDOR_v44.txt`.
