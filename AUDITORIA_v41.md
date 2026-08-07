# My Fit Plan v4.1 — Premium Foundation

## Objetivo

Preparar Free / Premium / Founder sin activar pagos todavía, mantener 0 € de
coste adicional y corregir la navegación de Perfil en móvil.

## Free

Mantiene rutinas manuales, entrenamiento personalizado, biblioteca, historial
básico, cuenta, sincronización cloud, fotografías privadas y uso offline.

## Premium / Founder

Desbloquea entrenamiento adaptativo My Fit Plan, coach avanzado, progresión
automática, cargas recomendadas, deload, smart replan y comparación avanzada.

## Entitlement

`mfp_entitlements` sigue siendo solo lectura desde el cliente. La v4.1 valida
`premium_expires_at`, devuelve un Premium caducado a Free y cachea el plan para
que Premium/Founder siga funcionando sin cobertura.

## Perfil móvil

Las seis pestañas se muestran simultáneamente. Pruebas superadas:
- 320 px: 6/6 visibles.
- 375 px: 6/6 visibles.
- 390 px: 6/6 visibles.
- 430 px: 6/6 visibles.
- Las seis pestañas son pulsables.
- Sin desplazamiento horizontal.

## Regresión

- Cloud Photos: superado.
- Rutina directa Free: superado.
- MFP bloqueado Free: superado.
- MFP desbloqueado Founder: superado.
- Premium caducado: superado.
- Founder offline: superado.
- Free → Founder sin cerrar sesión: superado.

## Auditoría estática

- 24 módulos JavaScript.
- 111 acciones UI con 111 manejadores.
- 10 acciones Premium protegidas.
- 34 recursos PWA.
- 0 imports rotos.
- 0 claves secretas.
- 0 escrituras cliente sobre `mfp_entitlements`.

## Pagos

No hay proveedor de pagos conectado todavía. Esta versión valida la separación
Free/Premium, el paywall y el entitlement antes de activar monetización.
