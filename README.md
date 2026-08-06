# My Fit Plan v3.8 · Adaptive HUD

## Corrección principal
La barra lateral de escritorio ya no puede aparecer en un iPhone aunque Safari
informe de un viewport de escritorio. El sistema combina viewport, pantalla,
capacidades táctiles y orientación para elegir uno de tres modos:

- `mobile`: dock inferior y rail oculto.
- `compact`: rail de iconos para tablet o ventanas intermedias.
- `desktop`: rail completo.

## Mejoras
- Reacción a cambios de orientación y tamaño.
- Protección frente a desplazamiento horizontal.
- Dock optimizado para 320–430 px.
- Modo horizontal compacto.
- Ocultación del dock al abrir el teclado.
- Modales convertidos en hojas inferiores en móvil.
- `aria-current` en la navegación activa.
- Diagnóstico de HUD y anchura desde Centro de control.
- Orientación libre en el manifiesto.
- Migración automática desde v3.7.
