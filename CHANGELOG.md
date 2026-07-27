# My Fit Plan v3.4C.4

- La rutina puede ser la recomendación del entrenador.
- El sistema deja de forzar una alternativa distinta.
- Evalúa la proximidad de la última sesión y el solapamiento muscular reciente.
- Recomienda una alternativa solo cuando existe un conflicto claro.
- Permite explorar alternativas manualmente.
- Las alternativas pueden conservar hasta dos ejercicios útiles de la rutina.
- Rediseña completamente la tarjeta derecha.
- Corrige chips, textos y botones comprimidos o desbordados.
- Renueva la caché PWA.

# My Fit Plan v3.4C.3

- Añade memoria real de recomendaciones.
- Excluye por completo los ejercicios de la sesión principal.
- Excluye las propuestas vistas al pulsar “Otra distinta”.
- Conserva hasta 16 recomendaciones anteriores para aumentar la rotación.
- Reduce la repetición de patrones de movimiento.
- Rehace todas las tarjetas de Biblioteca.
- Elimina los palitos de las tarjetas y fichas sin vídeo.
- Unifica proporciones, botones, alturas y jerarquía visual.
- Añade fallback limpio para pósteres que no carguen.
- Renueva la caché PWA.

# My Fit Plan v3.4C.2

- Sustituye la selección de días existentes por un generador dinámico.
- Utiliza los 283 ejercicios de la biblioteca como candidatos.
- Excluye los ejercicios de la próxima sesión.
- Evita las últimas recomendaciones y penaliza repeticiones recientes.
- Respeta material, experiencia y duración preferida.
- Genera enfoques de empuje, tirón, pierna, torso, cuerpo completo y core.
- Añade el botón “Otra” para cambiar de propuesta inmediatamente.
- Conserva el origen y el contexto adaptativo al recargar la aplicación.
- Renueva la caché PWA.

# My Fit Plan v3.4C

- Rediseña por completo la entrada de Entrenar.
- La próxima sesión de la rutina pasa a ser la opción principal.
- Añade una sesión recomendada según el trabajo de los últimos siete días.
- Añade un constructor profesional de entrenamiento personalizado.
- Permite ordenar ejercicios y editar series, repeticiones y descansos.
- Mantiene el check-in adaptativo después de elegir la sesión.
- Las alternativas no modifican ni avanzan la rutina.
- Guarda el origen de cada sesión en el historial.
- Renueva la caché PWA.

# My Fit Plan v3.4B

- Añade check-in previo de tiempo, energía, sueño y molestias.
- Crea versiones temporales de 25, 40 y 60 minutos.
- Prioriza los movimientos principales.
- Reduce accesorios, series y descansos de forma prudente.
- Mantiene intacta la rutina permanente.
- Permite restaurar la sesión completa antes de comenzar.
- Añade banner y explicación de los cambios durante el entrenamiento.
- Guarda preparación y adaptación en el historial.
- Bloquea la adaptación ante molestias importantes.
- Renueva la caché PWA.

# My Fit Plan v3.4A

- Añade un motor profesional de progresión.
- Analiza las últimas seis referencias por ejercicio.
- Detecta aumento de carga, mejora, consolidación, estancamiento y regresión.
- Añade confianza del análisis según la cantidad de datos.
- Nueva tarjeta del Entrenador en Inicio.
- Panel completo de la próxima sesión.
- Resumen semanal con adherencia, récords, mejoras y distribución.
- Lectura del entrenador al finalizar una sesión.
- Mantiene intactas las fotografías privadas y las rutinas.
- Renueva la caché PWA.

# My Fit Plan v3.3.1

- Rediseña la barra de pestañas del perfil para eliminar el espacio vacío.
- Añade Comparación libre para dos fotografías cualesquiera.
- No obliga a clasificar las imágenes como frontal, lateral o posterior.
- Incluye comparación lado a lado y deslizador.
- Permite intercambiar ambas imágenes y elegir entre contener o recortar.
- Las fotos temporales no se guardan.
- Renueva la caché PWA.

# My Fit Plan v3.3

- Nuevo apartado Cuerpo dentro de Perfil.
- Fotografías frontal, lateral y posterior.
- Comparador lado a lado y deslizador antes/después.
- Registro de pecho, cintura, cadera, brazo, muslo y gemelo.
- Gráficos de evolución corporal.
- Fotografías privadas en IndexedDB.
- PIN opcional para bloquear el apartado.
- Exportación y eliminación individual de revisiones.
- Acceso rápido desde Inicio.
- Migración automática desde v3.2.3B.
- Nueva caché PWA.

# My Fit Plan v3.2.3B

- Rehace la estética de las tarjetas en Biblioteca y Plan visual.
- Los 30 ejercicios animados usan ahora una preview completa con póster.
- Se elimina el aspecto roto o partido de las tarjetas premium.
- Mantiene los 5 pilotos Real Motion con modelo anatómico mejorado.
- Conserva el resto de vídeos Premium Motion para cubrir los ejercicios esenciales.
- Renueva la caché de la PWA.

# My Fit Plan v3.2.3A · Real Motion

- Nuevo estándar visual anatómico semirrealista.
- Cinco ejercicios piloto completamente rehechos.
- El músculo principal se integra en rojo en el movimiento.
- Los secundarios se integran en naranja.
- Nueva tarjeta visual en la biblioteca; desaparecen los palitos en los pilotos.
- Visor Real Motion con pausa, repetición, velocidad y pantalla completa.
- Recursos integrados mediante Blob URLs para evitar rutas rotas.
- Migración automática de los datos anteriores.
- Nueva caché PWA.

# My Fit Plan 3.2.2.2

- Corrige definitivamente la reproducción de Premium Motion.
- Convierte los vídeos integrados en Blob URLs compatibles con Safari y Chrome.
- Fuerza la actualización de todos los módulos críticos.
- Renueva la caché de la PWA.
- Conserva los datos de versiones anteriores.

# My Fit Plan 3.2.2.1

- Integra internamente los 30 vídeos Premium Motion y sus pósteres.
- Evita fallos por carpetas `assets` ausentes, mal subidas o anidadas.
- Mantiene una ruta externa de respaldo.
- Renueva la caché de la PWA.
- Conserva todos los datos de versiones anteriores.

# Cambios 3.2.1

- Recursos multimedia integrados en `js/media-bundle.js`.
- Ya no depende de que `assets/` quede correctamente subida para mostrar los 20 vídeos y mapas musculares.
- Pestaña Claves forzada a mostrarse correctamente.
- Mensajes visibles cuando un recurso no puede cargarse.
- Nueva caché PWA y migración de datos desde 3.2.
