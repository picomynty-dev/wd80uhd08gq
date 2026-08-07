# Auditoría final — My Fit Plan v3.9 RC

## Resultado

La Release Candidate se ha revisado como versión previa a v4.0, sin añadir un bloque funcional nuevo.

### Cobertura

- 21 módulos JavaScript activos y alcanzables desde `app.js`.
- 97 acciones de botones enlazadas con su manejador.
- 31 recursos del shell PWA revisados.
- Onboarding completo.
- Inicio, Plan, Entrenar, Ejercicios y Perfil.
- Centro de control y diagnóstico.
- Rutina, día manual, My Fit Plan y personalizado.
- Calendario, cancelación, finalización y reprogramación.
- Guardado inmediato al minimizar/cerrar.
- Migración desde v3.8.1 y recuperación ante estado actual corrupto.
- Progresión, estancamiento, descarga y planificación inteligente.
- Progreso corporal sin fotografías, exportación/reset de backup e historial.
- Responsive móvil, móvil horizontal, tablet y escritorio.

## Correcciones de RC

1. Abrir una sesión concreta ya no adelanta la rutina antes de terminarla.
2. Sesiones antiguas con 4 series ya no migran como si tuvieran 3.
3. El último peso, repeticiones o nota se guarda al cerrar/minimizar, aunque el debounce todavía no hubiera terminado.
4. Valores numéricos inválidos se acotan.
5. Si el estado v3.9 está corrupto se intenta recuperar una versión anterior válida.
6. El sistema de fotografías limpia blobs parciales y no bloquea medidas o revisiones ante un fallo de IndexedDB.
7. La actualización ya no borra caches o service workers ajenos al proyecto.
8. El service worker instala primero un núcleo obligatorio y trata el resto como opcional.
9. Todos los módulos comparten el identificador `?v=39`.
10. El diagnóstico revisa coherencia de series, objetivos e historial.
11. El dock conserva nombre accesible en orientación horizontal.

## Limitaciones de laboratorio

El entorno de pruebas bloquea servir la aplicación desde un origen HTTP/HTTPS local. Por ello el service worker real y la persistencia de fotografías en IndexedDB deben recibir la última comprobación en el despliegue de GitHub Pages/iPhone. La estructura del service worker, sus rutas y el código de fotografías sí se validaron.

## Mejora opcional no incluida

Una copia única que incluya también fotografías sería útil para recuperación total, pero cambiaría el formato del backup y podría generar archivos grandes. Se ha dejado fuera de la RC hasta que el usuario decida si quiere incorporarla antes de v4.0.
