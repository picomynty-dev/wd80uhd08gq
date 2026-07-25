# My Fit Plan — MVP v0.1

Aplicación web progresiva (PWA) sin frameworks, cuentas ni servidores. Los datos se guardan únicamente en el navegador mediante `localStorage`.

## Funciones incluidas

- Cuestionario inicial de objetivo, días y duración.
- Planes de 2, 3 o 4 días.
- Entrenamiento guiado.
- Registro de peso y repeticiones.
- Sustitución de ejercicios cuando una máquina está ocupada.
- Historial, objetivo semanal y racha.
- Funcionamiento offline después de la primera carga.
- Instalación como PWA en navegadores compatibles.

## Probarla en Windows

No abras `index.html` directamente si quieres probar la instalación y el modo offline. Levanta un servidor local:

1. Descomprime la carpeta.
2. Abre PowerShell dentro de la carpeta.
3. Ejecuta:

```powershell
python -m http.server 8080
```

4. Abre `http://localhost:8080` en Chrome o Edge.

## Publicarla gratis con GitHub Pages

1. Crea una cuenta en GitHub.
2. Crea un repositorio público llamado `my-fit-plan`.
3. Sube todos los archivos conservando las carpetas.
4. En el repositorio entra en **Settings > Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Selecciona la rama `main` y la carpeta `/ (root)`.
7. Guarda y espera a que GitHub muestre la dirección publicada.

## Estructura

- `index.html`: estructura de la interfaz.
- `styles.css`: diseño visual.
- `app.js`: rutinas, almacenamiento y navegación.
- `manifest.webmanifest`: datos de instalación.
- `service-worker.js`: caché y funcionamiento offline.
- `icons/`: iconos de la aplicación.

## Aviso

Este MVP ofrece orientación general para adultos sanos. No sustituye asesoramiento médico, fisioterapéutico, nutricional o de entrenamiento profesional.
