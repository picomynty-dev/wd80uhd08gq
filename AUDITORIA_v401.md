# My Fit Plan v4.0.1 — Cloud Sync UX

## Cambio principal

La sincronización deja de preguntar entre nube y dispositivo durante cambios
normales. La nube es la referencia principal y el dispositivo sigue siendo la
caché offline inmediata.

## Reglas probadas

1. Dispositivo nuevo + nube existente → descarga cloud automática.
2. Cambio solo en el dispositivo → subida automática sin pregunta.
3. Segundo cambio consecutivo → nueva subida automática sin pregunta.
4. Cambio solo en nube → descarga automática.
5. Nube y dispositivo cambian desde la misma revisión → conflicto real.
6. Un conflicto real se resuelve desde Perfil > Cuenta.
7. Descargar de la nube guarda antes una copia local de recuperación.
8. Subir este dispositivo permite forzar conscientemente la copia local.

## Pruebas cloud simuladas

- Nube inicial: revisión 5.
- Primer cambio local: revisión 6.
- Segundo cambio local: revisión 7.
- Cambio simultáneo remoto: revisión 8 → conflicto detectado.
- Descarga manual: nube restaurada.
- Subida manual: revisión 9.

## Interfaz

- Cuenta móvil 390×844: superada.
- Cuenta escritorio 1536×900: superada.
- Sin overflow horizontal.
- 108 acciones de interfaz enlazadas.

## Seguridad

- No se añadió ninguna clave secreta.
- La publishable key sigue siendo la única credencial cliente.
- No se requieren cambios de SQL ni desactivar RLS.
- La sesión de v4.0 se conserva durante la actualización.
