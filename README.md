# My Fit Plan v3.7 · Estabilización, supervisión de fallos y nuevo HUD

Esta versión convierte la v3.6 en una candidata estable para el cierre del proyecto.

## Nuevo HUD

- Barra lateral profesional en escritorio.
- Dock flotante optimizado en móvil.
- Botón central de entrenamiento.
- Iconos SVG coherentes en navegación y acciones.
- Cabecera contextual según la pantalla.
- Indicador online/sin conexión.
- Acceso persistente a la sesión en curso.
- Diseño responsive sin desplazamiento horizontal.

## Supervisión y recuperación

- Centro de control con diagnóstico local.
- Exportación de informes de incidencias.
- Pantalla segura cuando falla un renderizado.
- Captura de errores globales y promesas rechazadas.
- Normalización de datos dañados.
- Copia de seguridad e importación comprobadas.

## Correcciones principales

- Acciones dentro de modales reparadas.
- Rutina, My Fit Plan y personalizado conservan sus flujos separados.
- Origen de My Fit Plan corregido en historial y finalización.
- Calendario, reprogramación y entrenamiento desde agenda comprobados.
- Listener de tema duplicado eliminado.
- Borrado de fotografías ahora espera a IndexedDB.
- Mensaje claro cuando Safari bloquea el almacenamiento de fotografías.
- Atajos PWA de Entrenar y Ejercicios ahora abren su pantalla correcta.
- Estrategia de caché y actualización rehecha.
- Diagnóstico histórico sin falsos errores tras eliminar un ejercicio personalizado.
- Eliminados dos paquetes multimedia antiguos no utilizados.

## Migración

La v3.7 importa automáticamente los datos de la v3.6 y versiones anteriores. No es necesario borrar la aplicación.

Consulta `AUDITORIA_v37.md` para ver la matriz completa de pruebas y las limitaciones pendientes de comprobar en un dispositivo real.
