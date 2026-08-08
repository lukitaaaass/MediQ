-- Historial de "Informes" y "Analíticas".
--
-- Hasta ahora ambas herramientas eran de un solo uso: subías el documento,
-- veías el resultado y al recargar no quedaba rastro. Estas dos tablas dan
-- persistencia para que el bloque "Recientes" del panel lateral pueda
-- listarlos y reabrirlos.
--
-- Mismo modelo que `chats`: el cliente genera el id, `data` guarda el JSON
-- que devuelve la API tal cual (es lo que renderResult() consume), y RLS
-- deja a cada usuario ver y tocar solo lo suyo.
--
-- Ejecutar en el SQL Editor de Supabase (una sola vez).

-- ─────────────────────────── Informes ───────────────────────────
create table if not exists public.informes (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'Informe',
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists informes_user_updated_idx
  on public.informes (user_id, updated_at desc);

alter table public.informes enable row level security;

drop policy if exists "informes_select_own" on public.informes;
create policy "informes_select_own" on public.informes
  for select using (auth.uid() = user_id);

drop policy if exists "informes_insert_own" on public.informes;
create policy "informes_insert_own" on public.informes
  for insert with check (auth.uid() = user_id);

drop policy if exists "informes_update_own" on public.informes;
create policy "informes_update_own" on public.informes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "informes_delete_own" on public.informes;
create policy "informes_delete_own" on public.informes
  for delete using (auth.uid() = user_id);

-- ────────────────────────── Analíticas ──────────────────────────
create table if not exists public.analiticas (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default 'Analítica',
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analiticas_user_updated_idx
  on public.analiticas (user_id, updated_at desc);

alter table public.analiticas enable row level security;

drop policy if exists "analiticas_select_own" on public.analiticas;
create policy "analiticas_select_own" on public.analiticas
  for select using (auth.uid() = user_id);

drop policy if exists "analiticas_insert_own" on public.analiticas;
create policy "analiticas_insert_own" on public.analiticas
  for insert with check (auth.uid() = user_id);

drop policy if exists "analiticas_update_own" on public.analiticas;
create policy "analiticas_update_own" on public.analiticas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "analiticas_delete_own" on public.analiticas;
create policy "analiticas_delete_own" on public.analiticas
  for delete using (auth.uid() = user_id);
