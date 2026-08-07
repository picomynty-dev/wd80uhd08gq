# My Fit Plan v4.0.1 · Cloud Sync UX

## Objetivo
Eliminar las preguntas repetitivas de sincronización y convertir My Fit Plan
Cloud en una experiencia automática.

## Comportamiento
- La nube es la referencia principal al iniciar sesión en un dispositivo nuevo.
- Cada cambio se guarda localmente de inmediato y se sincroniza en segundo plano.
- Si solo cambió el dispositivo, se sube sin preguntar.
- Si solo cambió la nube, se descarga sin preguntar.
- Solo aparece un conflicto cuando nube y dispositivo cambiaron desde la misma revisión.
- Antes de una descarga que reemplaza datos locales se crea una copia local de recuperación.
- Perfil > Cuenta ofrece sincronización manual, descarga cloud y subida forzada del dispositivo.

## Coste
No introduce ningún servicio nuevo de pago.
