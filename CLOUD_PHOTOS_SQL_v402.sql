-- ============================================================
-- MY FIT PLAN v4.x
-- Cloud Foundation · Paso 2
-- Storage privado para fotografías de progreso
-- ============================================================

-- 1) Crear/actualizar bucket privado.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mfp-progress-photos',
  'mfp-progress-photos',
  false,
  5242880, -- 5 MB por imagen
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Limpiar políticas anteriores de My Fit Plan, si existiesen.
drop policy if exists "mfp_photos_select_own" on storage.objects;
drop policy if exists "mfp_photos_insert_own" on storage.objects;
drop policy if exists "mfp_photos_update_own" on storage.objects;
drop policy if exists "mfp_photos_delete_own" on storage.objects;

-- 3) Cada archivo debe vivir dentro de:
--    <auth.uid()>/<photo_id>.jpg
--
--    Ejemplo:
--    dbf9763f-b42d-4908-a32c-.../photo-123.jpg

create policy "mfp_photos_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mfp-progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "mfp_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mfp-progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "mfp_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mfp-progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'mfp-progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "mfp_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mfp-progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- Resultado esperado:
-- Bucket: mfp-progress-photos
-- Public: false
-- Máximo: 5 MB
-- MIME: JPEG / PNG / WEBP
-- Acceso: únicamente el usuario autenticado propietario
-- ============================================================
