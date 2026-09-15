-- ============================================================
-- MY FIT PLAN v4.4 · BETA FEEDBACK
-- Ejecutar una sola vez en Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.mfp_beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'experience'
    check (kind in ('bug','idea','experience')),
  message text not null
    check (char_length(message) between 10 and 2000),
  app_version text not null default '',
  screen text not null default '',
  diagnostics jsonb,
  status text not null default 'new'
    check (status in ('new','reviewing','resolved','ignored')),
  created_at timestamptz not null default now()
);

create index if not exists mfp_beta_feedback_user_created_idx
  on public.mfp_beta_feedback (user_id, created_at desc);

create index if not exists mfp_beta_feedback_status_created_idx
  on public.mfp_beta_feedback (status, created_at desc);

alter table public.mfp_beta_feedback enable row level security;

-- El navegador no necesita leer ni escribir esta tabla.
-- Las inserciones se hacen desde una Edge Function autenticada.
revoke all on table public.mfp_beta_feedback from public, anon, authenticated;

grant all on table public.mfp_beta_feedback to service_role;
