# My Fit Plan v4.0.2 — Auditoría Cloud Photos

## Resultado

La capa de fotografías privadas está integrada con Supabase Storage.

### Flujos comprobados
- Foto local antigua → subida automática: superado.
- Ruta `<user_id>/<photo_id>`: superado.
- Foto ausente en dispositivo nuevo → descarga: superado.
- Borrado sin conexión → cola local: superado.
- Recuperar internet → borrado cloud: superado.
- Repetir una subida sobre el mismo ID: superado.
- Guardar revisión desde la interfaz → foto cloud: superado.
- Eliminar revisión → foto cloud eliminada: superado.
- Perfil > Cuenta móvil: superado.
- Perfil > Cuenta escritorio: superado.

### Compresión
Una imagen de prueba de 5.323.158 bytes se redujo a 24.586 bytes en JPEG y
quedó muy por debajo del límite del bucket de 5 MB.

### Seguridad
- Bucket configurado: `mfp-progress-photos`.
- Ruta por usuario.
- Sin service role ni secret key en el cliente.
- Service Worker no intercepta peticiones a Supabase.
- Las políticas RLS del Paso 2 siguen siendo la barrera de acceso.

### Pendiente en dispositivo real
- Confirmar subida a Storage con la cuenta real.
- Abrir la misma cuenta en otro navegador/dispositivo y confirmar descarga.
- Comprobar persistencia IndexedDB en iPhone después de cerrar la PWA.
