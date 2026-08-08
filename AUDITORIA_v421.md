# My Fit Plan v4.2.1 — Paddle Price Hotfix

## Problema observado
Paddle.PricePreview confirmó que los dos price IDs entregados inicialmente estaban invertidos entre mensual y anual. La protección de v4.2 bloqueó correctamente el checkout.

Además, el paywall mostraba `formattedTotals.subtotal`, que es el importe previo a impuestos.

## Corrección
- Mensual: `pri_01kzgz5v4f27r5pvhyvc5b1y59`.
- Anual: `pri_01kzgz6wr16d5bg6zz2ndc3txz`.
- El paywall usa primero `formattedTotals.total`.
- La validación month/year permanece activa.
- No se modifica el webhook: su allowlist ya contiene ambos IDs y no depende de su orden.
- No se modifica Supabase ni Paddle.

## Prueba automatizada
- Precio mensual mostrado: 4,99 €.
- Precio anual mostrado: 39,99 €.
- Aviso de periodicidad: desaparece.
- Botón mensual usa el price ID mensual correcto.
- Botón anual usa el price ID anual correcto.
- JavaScript: sin errores de sintaxis.
