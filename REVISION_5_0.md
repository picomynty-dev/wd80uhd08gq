# Revisión de My Fit Plan 5.0

Fecha: 14–15 de septiembre de 2026. Base recuperada: v4.7 External Beta Candidate.

## Resultado

Reforma de la aplicación existente, con su modelo de datos e integraciones. La nueva capa de diseño se encuentra en `design-v5.css`. Los estilos de componentes anteriores se mantienen en `styles.css` para conservar compatibilidad con todos los formularios y pantallas.

## Correcciones concretas

| Problema encontrado | Corrección aplicada |
| --- | --- |
| La v4.7 ejecutaba una limpieza de caché que redirigía a `v=46`. | Eliminada esa redirección; versión 5.0 coherente en entradas y módulos. |
| `openProgressionDashboard` utilizaba `wrapper` sin declararlo. | La ventana se guarda y sus botones se conectan sobre la referencia válida. |
| Un único temporizador de escritura podía descartar la edición pendiente de otro campo. | Cola de valores por campo; se vacía antes de acciones, cambios de pantalla y envíos. |
| Finalizar o guardar una sesión podía mostrar éxito después de fallar el almacenamiento. | Se comprueba el resultado. Si falla la finalización, se restaura la sesión activa. |
| Una serie vacía podía marcarse completada y entrar en las estadísticas. | Se exigen repeticiones o segundos mayores que cero antes de completarla. |
| Una segunda llamada a finalizar podía acceder a una sesión ya cerrada. | Salida inmediata cuando no existe sesión activa. |
| Fechas sin hora podían aparecer en el día anterior en ciertos husos horarios. | Interpretación local de fechas `AAAA-MM-DD`. Pruebas en cuatro zonas. |
| El índice del próximo entrenamiento podía ser negativo o no entero tras importar datos. | Normalización al rango válido de días de la rutina. |
| La caché buscaba también en otras versiones o instalaciones. | Caché por ruta de instalación y lectura dentro de su versión. |
| Varios módulos necesarios eran opcionales en la instalación sin conexión. | El trabajador nuevo solo se instala si está disponible todo el conjunto de módulos. |
| La primera activación del trabajador podía recargar la página durante la configuración. | Se distingue la primera activación de una actualización; se vacían cambios pendientes al actualizar. |
| Un botón reactivado podía conservar `aria-disabled=true`. | Se sincroniza el atributo con su estado habilitado. |
| El texto blanco del color de acento podía tener poco contraste. | Elección del texto a partir de la luminancia del color guardado. |

## Cambios de diseño

Inicio recompuesto con jerarquía clara: próxima sesión y objetivo semanal primero; después resumen, actividad, agenda, accesos rápidos y progreso. La acción principal inicia directamente la rutina preparada. No se muestran resultados inventados en la aplicación: con historial vacío se presentan estados vacíos.

Nueva bienvenida con tipografía más grande, composición adaptable e ilustración de ejemplo construida con HTML y CSS. Cambios en navegación, biblioteca, selector de entrenamiento, series, diálogos y Perfil. La barra de Perfil utiliza tres columnas y dos filas en móvil. Se conservan los ajustes anteriores de tema y acento; los perfiles nuevos utilizan la nueva apariencia inicial.

La vista previa independiente sí incluye datos de ejemplo, identificados en su barra superior. Utiliza memoria propia y no conecta la cuenta ni los pagos.

## Qué se ha comprobado

- 24 pruebas automatizadas con Node.js, incluidas generación de las seis vistas principales, seis pasos de configuración y secciones de Perfil.
- Lectura de un estado de prueba con formato v4.7: IDs de rutinas, historial, fotos referenciadas, propietario y color conservados.
- Edición rápida de peso, repeticiones y notas; comprobación de guardado y navegación.
- Registro de una sesión, cálculo de volumen, historial, avance de rutina y carga posterior.
- Rechazo de series sin repeticiones y recuperación de la sesión ante fallo simulado de almacenamiento.
- Apertura del análisis de progresión y arranque de los módulos empaquetados de la vista previa.
- Fechas en Madrid, Los Ángeles, Honolulu y Tokio; permisos de Free/Premium/Founder; recomendaciones sin ejercicios duplicados dentro de cada propuesta.
- Instalación de los recursos del trabajador, separación entre cachés, respuesta sin conexión y solicitudes de versiones posteriores.
- Sintaxis de los 32 módulos, estructura básica del HTML generado y recursos locales existentes.
- Los seis archivos de configuración, funciones y migraciones bajo `supabase/` conservan los bytes de la base recuperada.

Las pruebas de generación usan un adaptador de documento en memoria, no el motor visual de un navegador. Las pruebas de estado usan datos de ejemplo y no acceden a la cuenta real. Las pruebas del trabajador simulan red y caché; no sustituyen una instalación PWA en Safari.

## Pendiente en el despliegue real

El navegador de este entorno bloqueó por política el servidor y los archivos locales. No se han realizado capturas ni comprobado visualmente el resultado en Chrome/Safari. Tampoco se ha iniciado sesión con credenciales del usuario, utilizado sus fotos, ejecutado pagos ni publicado la reforma.

Recorrido de aceptación, una vez cargada la versión en el enlace habitual:

1. Comprobar que aparecen la cuenta, rutinas e historial anteriores.
2. Revisar Inicio, Plan, Calendario, Entrenar, Ejercicios y las seis secciones de Perfil en ordenador y móvil, también en horizontal.
3. Registrar peso y repeticiones rápidamente, cambiar de pantalla y volver; completar una sesión y verificar el historial.
4. Probar tema claro, oscuro y un color personalizado; revisar teclado abierto, modales, temporizador y navegación inferior.
5. Comprobar carga de fotos ya guardadas y comparación de revisiones. Confirmar sincronización con otro dispositivo.
6. Con la app ya cargada e instalada, abrirla sin conexión y después reconectar.
7. Probar inicio/cierre de sesión y gestión Premium en Paddle Sandbox en el despliegue autorizado.

Se mantiene el bloqueo existente de distribución externa y el dato de contacto pendiente del proyecto. La actualización visual no cambia ese estado.
