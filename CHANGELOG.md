# My Fit Plan v4.3 — Subscription Management Sandbox

- Perfil > Cuenta incorpora gestión de suscripción.
- Muestra Mensual/Anual, estado y fecha de renovación/finalización.
- Detecta cancelaciones programadas y explica cuándo volverá a Free.
- Añade botón Gestionar suscripción.
- Añade botón Método de pago.
- Crea enlaces autenticados y temporales del Paddle Customer Portal.
- Nueva Edge Function `billing-portal` protegida con JWT de usuario.
- El cliente no puede elegir otro user_id para consultar billing.
- Paddle API key exclusivamente server-side.
- Founder no depende de Paddle.
- Mantiene las seis pestañas de Perfil visibles en móvil.
- No requiere SQL nuevo.

# My Fit Plan v4.2 — Monetization Sandbox

- Paddle Sandbox conectado al paywall Premium.
- Producto y precios mensual/anual configurados.
- PricePreview muestra precios localizados y valida la periodicidad.
- Checkout envía el user_id de Supabase como customData.
- checkout.completed nunca concede Premium desde el navegador.
- Edge Function segura para subscription.created/subscription.updated.
- Firma Paddle-Signature verificada.
- Reintentos idempotentes y eventos fuera de orden protegidos.
- Founder permanece permanente aunque exista billing Paddle.
- Se mantiene Cloud, Cloud Photos, offline y la barra Perfil 6/6.
- Sin pagos reales en esta versión.

# My Fit Plan v4.1 — Premium Foundation

- Añade planes Free, Premium y Founder usando el entitlement read-only de Supabase.
- Premium caducado vuelve a Free automáticamente sin perder datos.
- Cachea entitlement para conservar Premium offline.
- Añade paywall y pantalla de ventajas sin pagos activos todavía.
- Bloquea My Fit Plan adaptativo, coach avanzado, progresión/deload, smart replan y comparación avanzada para Free.
- Mantiene rutinas manuales, personalizado, biblioteca, historial, Cloud y fotos privadas en Free.
- Añade actualización manual de plan desde Perfil > Cuenta.
- Incluye SQL administrativo de prueba para asignar Founder/Premium/Free sin exponer permisos al cliente.
- Corrige Perfil móvil: las 6 pestañas se ven simultáneamente, sin swipe.

# My Fit Plan v4.0.2 — Cloud Photos

- Sincronización privada de fotografías con Supabase Storage.
- Migración automática de fotografías locales existentes.
- Restauración automática en dispositivos nuevos.
- Caché local conservada para funcionamiento offline.
- Cola de borrados cuando el dispositivo está sin conexión.
- Borrado cloud al eliminar revisiones.
- Limpieza de fotos antes de eliminar la cuenta.
- Estado de Cloud Photos en Perfil > Cuenta y Centro de control.
- Compresión adaptativa para ahorrar almacenamiento gratuito.
- Mantiene intacto el sistema automático de v4.0.1.
- No requiere SQL adicional al Paso 2 ya ejecutado.

# My Fit Plan v4.0.1 — Cloud Sync UX

- Elimina falsos conflictos de sincronización.
- Usa la revisión remota como señal principal para detectar cambios externos.
- La nube se carga automáticamente en dispositivos nuevos.
- Los cambios locales se suben automáticamente si la nube no avanzó.
- Los cambios remotos se descargan automáticamente si el dispositivo no cambió.
- Solo pregunta ante conflictos reales entre dos dispositivos.
- Guarda una copia local de recuperación antes de reemplazar datos por la nube.
- Añade Descargar de la nube y Subir este dispositivo en Perfil > Cuenta.
- Mantiene sesión, device ID y metadatos de v4.0.
- Mantiene funcionamiento offline.
- No requiere cambios SQL ni gastos adicionales.

# My Fit Plan v4.0 — Cloud Foundation

- Añade cuentas My Fit Plan con Supabase Auth.
- Añade registro, login, logout y recuperación de contraseña.
- Mantiene un modo invitado completamente funcional.
- Migra automáticamente el estado local a una cuenta nueva.
- Restaura cloud automáticamente en un dispositivo sin datos locales.
- Añade sincronización automática local-first.
- Añade control de revisiones para evitar sobrescribir cambios de otro dispositivo.
- Añade resolución manual de conflictos local/cloud.
- Añade estado de sincronización en Perfil.
- Añade pestaña Cuenta.
- Añade eliminación completa de cuenta.
- Mantiene las fotografías solo en almacenamiento privado local durante esta fase.
- Evita que el service worker intercepte las llamadas externas a Supabase.
- Versiona todos los módulos como v4.0.

# My Fit Plan v3.9 RC

- Release Candidate previa a v4.0.
- Corrige avance prematuro de rutina al preparar días manuales/calendario.
- Corrige migración de sesiones antiguas con series personalizadas.
- Fuerza guardado de campos pendientes al cerrar/minimizar.
- Acota objetivos, pesos, repeticiones y RIR.
- Refuerza fotografías privadas ante fallos de IndexedDB.
- Limita limpieza de caché/service workers a My Fit Plan.
- Hace el precache offline tolerante a recursos opcionales.
- Añade fallback a caché ante respuestas de red no válidas.
- Versiona todos los imports de módulos.
- Amplía comprobaciones del Centro de control.

# My Fit Plan v3.8.1

- Corrige el dock cortado al usar un teléfono en horizontal.
- Elimina el desbordamiento visual del botón Entrenar.
- Normaliza iconos del rail a contenedores cuadrados 1:1.
- Centra y estabiliza los SVG en escritorio.
- Aumenta espaciados y padding del dashboard en PC.
- Mejora proporciones del rail lateral.
- Mantiene intactas las funciones y datos de v3.8.
- Renueva caché y almacenamiento de la PWA.

# My Fit Plan v3.8

- Corrige el rail de escritorio visible en iPhone.
- Añade detector adaptativo independiente de las media queries.
- Añade modos mobile, compact y desktop.
- Rediseña el dock inferior para 320–430 px.
- Añade rail compacto para tablet y ventanas intermedias.
- Corrige orientación horizontal y teclado de iOS.
- Evita desplazamiento horizontal del documento.
- Mejora modales y acciones en móvil.
- Añade diagnóstico de layout al Centro de control.
- Añade `aria-current` a la navegación.
- Permite cualquier orientación en la PWA.
- Renueva almacenamiento y caché a v3.8.

# My Fit Plan v3.7

- Remodelación completa del HUD móvil y escritorio.
- Centro de control, diagnóstico y exportación de incidencias.
- Error boundary con pantalla de recuperación.
- Corrige acciones dentro de modales que no respondían.
- Corrige el botón “Entrenar este día” para iniciar la rutina directamente.
- Corrige el origen de sesiones My Fit Plan en historial y finalización.
- Evita duplicar listeners del tema en cada guardado.
- Mejora el borrado asíncrono de fotografías y datos.
- Rehace la estrategia de caché y actualización PWA.
- Mejora accesibilidad, foco, botones, iconos y estados online/offline.
- Corrige los atajos PWA de Entrenar y Ejercicios.
- Evita ejecutar el diagnóstico completo cuatro veces por segundo durante el descanso.
- Evita falsos errores por ejercicios personalizados eliminados del historial.
- Mejora el aviso cuando el navegador bloquea IndexedDB para fotografías.
- Amplía los objetivos táctiles pequeños.
- Permite usar la PWA en orientación vertical u horizontal.
- Elimina recursos multimedia antiguos no utilizados y reduce el proyecto.

# My Fit Plan v3.6

- Añade motor de doble progresión.
- Recomienda peso, series y rango de repeticiones.
- Añade botón para aplicar el objetivo.
- Detecta mejoras, regresiones y estancamientos.
- Integra el check-in en la decisión de carga.
- Añade descarga inteligente reversible.
- Añade gráfico y métricas avanzadas por ejercicio.
- Añade panel de progresión en Inicio.
- Guarda la descarga junto al historial.
- Renueva la caché PWA.

# My Fit Plan v3.5

- Añade calendario semanal inteligente.
- Distribuye la rutina en rotación continua.
- Detecta sesiones perdidas desde la activación del calendario.
- Permite entrenar, mover u omitir cada sesión.
- Añade reorganización automática de pendientes.
- Vincula entrenamientos con la fecha programada.
- Añade tarjeta semanal en Inicio.
- Añade acceso desde Inicio y Plan.
- Migra automáticamente los datos anteriores.
- Renueva la caché PWA.

# My Fit Plan v3.4D

- Rehace la Biblioteca como Biblioteca Pro.
- Añade filtros por patrón de movimiento y disponibilidad.
- Añade puntuación de calidad y compatibilidad de material.
- Rediseña la ficha técnica con fases, cues, respiración y ritmo.
- Añade sustituciones inteligentes en plan y entrenamiento.
- Clasifica alternativas por patrón, músculo, nivel y material.
- Renueva la caché PWA.

# My Fit Plan v3.4C.7

- Separa rutina, My Fit Plan y personalizado en tres flujos distintos.
- La rutina empieza directamente.
- El check-in pasa a pertenecer solo a “Entrenamiento My Fit Plan”.
- El personalizado empieza directamente después del constructor.
- Cambia “Continuar al check-in” por “Empezar entrenamiento”.
- Las sesiones My Fit Plan y personalizadas no avanzan la rutina.
- Renueva el diseño del selector y la caché PWA.

# My Fit Plan v3.4C.6

- Repara el acceso al check-in personalizado.
- Añade comprobación directa del botón.
- Elimina rectángulos blancos y grises.
- Recupera las tarjetas de ejercicios.
- Fuerza una actualización limpia sin borrar rutinas, historial o fotografías.
- Actualiza inmediatamente el service worker.

# My Fit Plan v3.4C.5

- Corrige el botón “Continuar al check-in” del entrenamiento personalizado.
- Evita que el constructor vuelva a renderizarse después de pulsar continuar.
- Copia el borrador antes de cerrarlo para no perder ejercicios ni ajustes.
- Añade una confirmación visual al abrir el check-in.
- Renueva la caché PWA.

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
