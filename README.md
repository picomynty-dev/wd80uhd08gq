# My Fit Plan v4.0 — Cloud Foundation

Primera versión de My Fit Plan con cuentas y sincronización cloud, manteniendo
el funcionamiento local/offline de la aplicación.

## Incluye
- Registro con email y contraseña.
- Confirmación por email compatible con Supabase Auth.
- Inicio/cierre de sesión.
- Recuperación y cambio de contraseña.
- Migración automática de datos locales al crear una cuenta nueva.
- Descarga automática de datos cloud en un dispositivo nuevo.
- Sincronización automática después de cambios locales.
- Protección frente a conflictos entre dos dispositivos.
- Plan Free/Premium preparado mediante `mfp_entitlements`.
- Eliminación completa de cuenta.
- Modo invitado sin necesidad de registrarse.
- Sincronización local-first para seguir entrenando sin internet.

## Importante
Las fotografías siguen siendo locales en esta fase. No se envían a Supabase.

Consulta `CLOUD_SETUP_v40.md` antes del primer despliegue.
