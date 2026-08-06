# Auditoría técnica integral · My Fit Plan v3.7

**Fecha de revisión:** 6 de agosto de 2026  
**Base revisada:** My Fit Plan v3.6  
**Resultado:** candidata estable para validación en GitHub Pages y iPhone

## 1. Alcance real de la revisión

Se revisaron **173 archivos**, formados por:

- **21 módulos JavaScript activos**.
- **144 recursos visuales y multimedia**.
- **2 iconos PWA**.
- `index.html`, `styles.css`, `manifest.webmanifest`, `service-worker.js` y documentación.

Tras la limpieza, el proyecto ocupa aproximadamente **6,65 MB**. Se eliminaron dos paquetes multimedia antiguos que no estaban conectados al grafo de módulos y un archivo de instrucciones obsoleto.

## 2. Controles estáticos

Resultado: **11/11 controles superados**.

| Control | Resultado |
|---|---:|
| Sintaxis de todos los módulos JavaScript | Correcto |
| Existencia de módulos y exportaciones importadas | Correcto |
| Cobertura de acciones y botones | Correcto |
| Cobertura de navegación | Correcto |
| Tipo explícito en todos los botones | Correcto |
| Identificadores estáticos sin duplicados | Correcto |
| Recursos declarados en el service worker | Correcto |
| Iconos y rutas del manifiesto | Correcto |
| Atajos PWA conectados a pantallas reales | Correcto |
| Versión, caché y clave de almacenamiento coherentes | Correcto |
| Estructura básica y balance de CSS | Correcto |

El registro contiene **102 referencias `data-action`**: **97 acciones de clic** y **5 acciones de campos/formularios**. No quedan acciones desconocidas ni manejadores muertos.

El service worker precarga **30 elementos esenciales** y todos existen en el paquete.

## 3. Recorridos probados en Chromium

### Inicio y creación del perfil

- Pantalla inicial.
- Asistente completo de seis pasos.
- Validación de mayoría de edad y material.
- Creación del perfil y del plan recomendado.
- Persistencia en `localStorage`.

### Entrenamientos

- Inicio directo de la rutina.
- Inicio directo de un día elegido desde Plan.
- Entrenamiento creado por My Fit Plan con check-in.
- Conservación del origen `mfp` en el historial.
- Entrenamiento personalizado sin pasar por el check-in.
- Añadir ejercicios al personalizado.
- Añadir y completar series.
- Peso, repeticiones y RIR.
- Temporizador: sumar tiempo, pausar, reanudar y saltar.
- Guardar y salir.
- Recuperar una sesión desde el HUD.
- Finalizar y guardar el entrenamiento.
- Lectura del entrenador y récord generado.

### Progresión

- Apertura del detalle de progresión.
- Acción «Aplicar objetivo» dentro de un modal.
- Actualización de objetivos sin cerrar incorrectamente la app.
- Historial y panel avanzado en las fichas.

### Calendario

- Semana de siete días.
- Configuración de días y hora.
- Reprogramación manual.
- Inicio de una sesión desde el calendario.
- Conservación de fecha e identificador de la programación.

### Biblioteca y planes

- Búsqueda y filtrado.
- Apertura de fichas técnicas.
- Creación de un ejercicio personalizado.
- Aparición en el filtro de creados.
- Adición del ejercicio a un día del plan.
- Persistencia después de exportar e importar una copia.

### Perfil, progreso y seguridad

- Pestañas Progreso, Cuerpo, Historial, Datos y Ajustes.
- Guardado de ajustes visuales.
- Exportación de copia JSON.
- Importación de la misma copia y confirmación destructiva.
- Registro de dos revisiones corporales mediante medidas.
- Comparador de revisiones.
- Exportación del diagnóstico técnico.

### Responsive y accesibilidad básica

Se revisaron las cinco vistas principales y el calendario en:

- **390 × 844 px** — móvil.
- **1440 × 1000 px** — escritorio.

Resultado:

- Sin desplazamiento horizontal.
- Sin botones visibles menores de 24 px tras la corrección del enlace «Ver todas».
- Sin botones visibles sin nombre accesible.
- Sin errores de ejecución detectados durante esos recorridos.

## 4. Fallos encontrados y corregidos

### Alta prioridad

1. **Acciones de modales que no respondían.**  
   La escucha de clics estaba limitada al contenedor principal; los modales se insertaban fuera. La delegación ahora se hace en `document` y todas las acciones dinámicas comparten el mismo sistema seguro.

2. **«Entrenar este día» abría un check-in que no correspondía.**  
   Los días de la rutina ahora empiezan directamente.

3. **Origen incorrecto de My Fit Plan.**  
   Se conserva `sessionSource: "mfp"`, el índice de la rutina de origen y la etiqueta correcta al finalizar.

4. **Actualizaciones PWA propensas a mezclar versiones.**  
   Se rehízo la estrategia de caché. El nuevo service worker no fuerza `skipWaiting` durante la instalación y solo devuelve HTML como respaldo para navegaciones.

5. **Falta de recuperación global.**  
   Se añadió captura de errores, registro de promesas rechazadas, pantalla segura, diagnóstico y exportación de incidencias.

### Prioridad media

6. **Listeners del tema duplicados después de cada guardado.**  
   Ahora solo se registra uno.

7. **Diagnóstico completo ejecutado durante cada tic del temporizador.**  
   Se eliminó del ciclo de 250 ms y se añadió caché temporal del estado del HUD.

8. **Borrado de fotografías sin esperar a IndexedDB.**  
   El reinicio total ahora espera a que termine la eliminación y registra cualquier fallo.

9. **Aviso técnico incomprensible cuando Safari bloquea fotografías.**  
   La app explica que debe salirse del modo privado o guardarse solo la medición.

10. **Falso error al eliminar un ejercicio personalizado usado antiguamente.**  
    El diagnóstico diferencia referencias activas rotas de referencias históricas conservadas sin ficha.

11. **Atajos PWA sin enrutamiento.**  
    `?view=workout` y `?view=library` ya se interpretan al iniciar.

12. **Bloqueo de orientación del manifiesto.**  
    Se eliminó para permitir móvil, tableta y escritorio en vertical u horizontal.

13. **Objetivo táctil pequeño.**  
    El enlace «Ver todas» pasó a tener una zona interactiva suficiente.

14. **Recursos obsoletos.**  
    Se eliminaron `media-bundle.js`, `media-bundle-pro.js` y unas instrucciones antiguas que ya no utilizaba la aplicación.

## 5. Remodelación del HUD

- Barra lateral fija y profesional en escritorio.
- Dock inferior flotante en móvil.
- Botón central destacado para Entrenar.
- Sistema coherente de iconos SVG.
- Cabecera contextual según la pantalla.
- Indicador de conexión.
- Barra persistente de entrenamiento activo.
- Centro de control con estado del sistema.
- Indicadores visuales de errores y recuperación.
- Nuevos estados de botones, foco, hover, pulsación y deshabilitado.
- Fondos, paneles y jerarquía visual unificados.
- Modo claro, oscuro y color de acento conservados.

## 6. Limitaciones de la comprobación local

La infraestructura del entorno de pruebas bloquea las conexiones HTTP locales y niega IndexedDB en documentos con origen opaco. Por esa razón no fue posible ejecutar aquí dos pruebas de plataforma de extremo a extremo:

1. Instalación/control real del service worker y recarga sin conexión desde un origen HTTP/HTTPS.
2. Persistencia real de una fotografía en IndexedDB.

Sí se comprobaron estáticamente el service worker, sus 30 recursos, el manifiesto, las rutas PWA y el tratamiento de errores de fotografías. Estas dos funciones deben verificarse después de subir la versión a GitHub Pages y abrirla en Safari/iPhone.

## 7. Criterio para cerrar el proyecto

La v3.7 está preparada como **candidata de estabilización**. Para convertirla en la versión final v4.0 deben completarse en el dispositivo real estas comprobaciones:

1. Actualizar desde v3.6 conservando todos los datos.
2. Cerrar y abrir la PWA dos veces.
3. Entrenar sin conexión después de haber cargado la app una vez.
4. Guardar y volver a abrir una fotografía de progreso.
5. Probar los tres entrenamientos: rutina, My Fit Plan y personalizado.
6. Confirmar que el centro de control muestra «Todo correcto».

No se recomienda añadir nuevas funciones grandes antes de superar esta validación final.
