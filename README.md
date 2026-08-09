# My Fit Plan v4.6 · Beta Pilot Sandbox

## Objetivo
v4.6 convierte la aplicación estable de v4.5 en una versión preparada para
hacer un piloto controlado con testers.

## Incluye
- Beta Pilot configurable desde `beta-config.json`.
- Welcome del tester una sola vez por cuenta.
- Guía del tester.
- Checklist de 4 pasos.
- Feedback rápido flotante.
- Progreso del piloto en Inicio y Perfil > Ajustes.
- Control remoto de apertura, mantenimiento, versión mínima y feedback.
- Bloqueo explícito de distribución externa mientras falten datos legales.

## No cambia
- Entrenamiento directo.
- My Fit Plan adaptativo.
- Entrenamiento personalizado.
- Progresión y deload.
- Calendario inteligente.
- Premium / Founder.
- Paddle Sandbox.
- Webhooks.
- Supabase SQL.

## Servidor
No hay que desplegar nada nuevo en Supabase.
El feedback utiliza la infraestructura `beta-feedback` de v4.4 que ya fue
validada en real.

## Distribución
`beta-config.json` contiene:
`externalDistributionAllowed: false`

No cambiarlo a `true` hasta completar responsable y correo de contacto en
`js/legal.js` y validar la versión publicada.
