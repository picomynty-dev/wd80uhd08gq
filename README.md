# My Fit Plan v4.5 · Stability & Landing Sandbox

## Objetivo
v4.5 corrige el flujo Welcome → Auth → Cloud → Home y pule la pantalla de
bienvenida sin modificar la lógica estable de entrenamiento.

## Cambios
- Login correcto abre Inicio cuando la cuenta tiene un perfil Cloud.
- Cloud-first durante login para proteger la nube frente a estados locales vacíos.
- Aislamiento del estado local por usuario.
- Cambio de cuenta sin copiar automáticamente los datos del usuario anterior.
- Sesión persistida recupera Cloud aunque el estado local esté vacío.
- Banner "Sesión en curso" oculto en Welcome/Onboarding.
- Banner real de entrenamiento sigue funcionando dentro de la app.
- Landing centrada y responsive en escritorio/móvil.
- Recuperación manual de copias locales antiguas si cuenta + nube quedan vacías.
- Mantiene Premium, Paddle Sandbox, feedback, borrado de cuenta y Beta Ready v4.4.

## Servidor
No hay SQL nuevo ni Edge Functions nuevas.
No cambies Paddle, webhook, Secrets ni Supabase para instalar v4.5.

## Recuperación
Si al iniciar sesión la nube está vacía y existe una copia local antigua,
My Fit Plan mostrará una ventana con nombre/fecha/sesiones/rutinas.
La copia solo se restaura después de confirmación explícita.
