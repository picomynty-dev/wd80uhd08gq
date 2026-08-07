# My Fit Plan v4.0 — Cloud Foundation · Configuración

## 1. Supabase Auth URL

En Supabase abre:
Authentication → URL Configuration

Configura:

Site URL
https://picomynty-dev.github.io/wd80uhd08gq/

Redirect URLs
https://picomynty-dev.github.io/wd80uhd08gq/

Mantén activado el proveedor Email. Para la beta recomendamos mantener
"Confirm Email" activado.

## 2. Qué sincroniza esta fase

- Perfil y ajustes
- Rutinas y carpetas
- Historial de entrenamientos
- Calendario y planificación
- Progresión y recomendaciones
- Medidas corporales
- Favoritos y ejercicios personalizados

Las fotografías todavía se guardan solo en el dispositivo. La fase de fotos
cloud tendrá almacenamiento privado propio.

## 3. Modelo offline

My Fit Plan guarda primero localmente. Si no hay internet, el entrenamiento
continúa funcionando. Al recuperar conexión, los cambios pendientes se
sincronizan.

## 4. Conflictos entre dispositivos

Si existen cambios distintos en el móvil y en la nube, My Fit Plan NO
sobrescribe automáticamente. Muestra una pantalla para elegir:
- conservar este dispositivo;
- usar la versión cloud.

## 5. Cuenta

Perfil → Cuenta permite:
- crear cuenta;
- iniciar sesión;
- recuperar contraseña;
- sincronizar manualmente;
- cerrar sesión;
- eliminar completamente la cuenta y sus datos.

## 6. Seguridad

El cliente contiene únicamente la Project URL y la publishable key. No contiene
secret key, service_role, contraseña de base de datos ni JWT secret. La
separación entre usuarios se aplica mediante RLS en Supabase.
