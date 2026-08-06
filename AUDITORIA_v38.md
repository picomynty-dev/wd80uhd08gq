# Auditoría My Fit Plan v3.8

## Objetivo

Corregir el fallo por el que el rail de escritorio podía ocupar la pantalla
completa en iPhone y cerrar la navegación adaptativa antes de la versión final.

## Resultado

- 174 archivos incluidos en el proyecto.
- 21 módulos JavaScript comprobados.
- 97 acciones de botón enlazadas con 97 manejadores.
- 30 recursos esenciales de la PWA verificados.
- 9 configuraciones responsive superadas.
- Sin desplazamiento horizontal en las pruebas.
- Inicio, Plan, Entrenar, Ejercicios y Perfil accesibles desde el HUD.
- Centro de control accesible.
- Giro de iPhone detectado correctamente.

## Modos del HUD

### Mobile

Se activa en teléfonos y pantallas de hasta 820 px. El rail queda oculto de
forma forzada y se utiliza un dock inferior.

### Compact

Se activa entre 821 y 1180 px. Utiliza un rail estrecho solo con símbolos.

### Desktop

Se activa por encima de 1180 px. Utiliza el rail completo con símbolos y texto.

## Caso de regresión de la captura

También se simuló un teléfono cuya pantalla mide 390 px pero cuyo navegador
informa de un viewport de 980 px. My Fit Plan siguió seleccionando el modo
mobile y ocultó el rail.

## Mejoras adicionales

- Protección frente a overflow horizontal.
- Soporte para orientación vertical y horizontal.
- Ocultación del dock cuando aparece el teclado.
- Modales tipo hoja inferior en móvil.
- `aria-current` para la navegación activa.
- Diagnóstico responsive en el Centro de control.
- Caché y almacenamiento migrados a v3.8.

## Comprobaciones pendientes en dispositivo real

- Abrir con internet y después sin conexión.
- Guardar una fotografía, cerrar la PWA y comprobar que persiste.
