# My Fit Plan 5.0 — Reforma visual y funcional

Versión preparada el 14–15 de septiembre de 2026 a partir de la v4.7 «External Beta Candidate», última versión probada localizada. Se ha recuperado su paquete de actualización y se han mantenido los recursos completos de la v4.6 sobre los que se construyó.

## Abrir y revisar

Abre **ABRIR_VISTA_PREVIA.html** con doble clic en el ordenador. Incluye el diseño y la lógica de la aplicación, con una rutina y un historial de ejemplo. La barra superior permite abrir la bienvenida.

La vista previa utiliza memoria independiente: sus modificaciones se reinician al recargar. Las cuentas, pagos y feedback están desconectados. No sustituye la aplicación instalada ni prueba la sincronización real. El funcionamiento completo de la PWA se encuentra en `index.html` y `js/`.

## Qué cambia

- Nuevo Inicio: próxima sesión, objetivo semanal, actividad de los últimos siete días, agenda, calendario, marcas y accesos rápidos.
- Bienvenida completamente nueva, con acceso visible a iniciar sesión, configurar un plan y explorar la demo.
- Interfaz clara y oscura, navegación lateral en ordenador y cinco botones en móvil. Tema y color anteriores se conservan cuando existen datos guardados.
- Pestañas de Perfil en dos filas en móviles: textos legibles y seis secciones accesibles.
- Biblioteca con buscador etiquetado, filtros plegables, restablecimiento de filtros y tarjetas uniformes.
- Registro de series con controles más grandes, mejor contraste y mensajes cuando faltan repeticiones o segundos.
- Correcciones de guardado, progreso, fechas y actualización sin conexión detalladas en `REVISION_5_0.md`.

La aplicación mantiene las rutinas, historial, referencias de fotos, personalización, separación Free/Premium/Founder y las integraciones existentes. Se mantienen las claves de almacenamiento y la base de fotografías para conservar compatibilidad en el mismo origen web y navegador.

## Actualizar el proyecto de GitHub Pages

1. En la app actual, abre Perfil → Ajustes → Exportar copia. El JSON contiene los datos y referencias, pero no los archivos de fotografías; estas continúan en su almacenamiento privado y en la nube cuando ya estén sincronizadas.
2. Extrae el paquete y abre la carpeta **APLICACION**.
3. Copia su contenido en la raíz del repositorio donde está el `index.html` actual. Incluye el nuevo `design-v5.css`, `js/theme.js` y `js/pending-input.js`, además de los demás archivos actualizados y los recursos `assets` e `icons`.
4. Mantén la dirección web habitual para continuar accediendo al almacenamiento local existente.
5. Abre el enlace añadiendo `?v=50` y comprueba el recorrido de revisión de `REVISION_5_0.md`.

No hace falta instalar dependencias para servir la app. Para una prueba local del proyecto completo, inicia `python -m http.server 8000` en esta carpeta y abre `http://localhost:8000`. El `index.html` principal utiliza módulos y debe servirse mediante HTTP/HTTPS; la vista previa HTML ya viene empaquetada para abrirse directamente.

## Verificaciones

**24 pruebas automatizadas superadas**, con comprobaciones de estado, migración, generación de pantallas, guardado, progreso, calendario, caché y arranque de la vista previa. Se verificó la sintaxis de los 32 módulos de JavaScript y la existencia de los recursos locales.

Estas pruebas no son pruebas visuales con Chrome o Safari. El navegador de este entorno bloqueó el acceso al servidor y los archivos locales; quedan pendientes la inspección visual en móvil/ordenador reales, el inicio de sesión en el despliegue, la sincronización de fotografías y Paddle Sandbox. No se afirma que la aplicación esté libre de todos los errores posibles.

Para ejecutar las pruebas: `npm test` con una versión reciente de Node.js. No necesitan paquetes adicionales.

## Estado de publicación

Paquete preparado para revisión del propietario. No se ha desplegado en el repositorio ni cambiado ningún servidor. Las funciones y migraciones de Supabase se conservan. Paddle continúa en Sandbox y `externalDistributionAllowed` continúa en `false`, como en la versión recuperada.

## Organización

- `index.html`, `styles.css`, `design-v5.css`, `js/`: aplicación completa.
- `assets/`, `icons/`: recursos originales conservados.
- `service-worker.js`, `manifest.webmanifest`: instalación y funcionamiento sin conexión.
- `ABRIR_VISTA_PREVIA.html`: demostración independiente para revisión.
- `tests/`: pruebas reproducibles de la lógica y la generación de vistas.
- `REVISION_5_0.md`: cambios, verificación y comprobaciones pendientes.
- `docs/historico/`: documentación de versiones anteriores.
- `supabase/`: configuración, funciones y migraciones existentes.
