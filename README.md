# My Fit Plan v4.0.2 · Cloud Photos

## Objetivo
Completar la sincronización cloud de las fotografías de progreso sin perder el
funcionamiento offline ni introducir costes nuevos.

## Funcionamiento
- Las fotografías se guardan primero en IndexedDB en el dispositivo.
- Si existe una cuenta conectada, se suben automáticamente a Supabase Storage.
- Cada objeto vive en `<user_id>/<photo_id>` dentro de `mfp-progress-photos`.
- En un dispositivo nuevo se descargan automáticamente las fotos que falten.
- Si no hay internet, la app sigue usando la copia local.
- Los borrados offline quedan en cola y se ejecutan al recuperar conexión.
- Al borrar una revisión se elimina su copia local y cloud.
- Antes de eliminar una cuenta se eliminan las fotografías referenciadas.
- Las imágenes se comprimen para reducir uso del almacenamiento gratuito.

## Seguridad
El bucket es privado. El acceso se limita mediante las políticas RLS ya
instaladas en Supabase. La publishable key puede permanecer en el cliente; no
se incluye ninguna service role ni secret key.

No se implementa cifrado de extremo a extremo en esta versión.
