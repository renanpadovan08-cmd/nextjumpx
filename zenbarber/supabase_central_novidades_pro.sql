-- ZenBarber • Central de Novidades profissional
-- Execute este SQL no Supabase em: SQL Editor > New query > Run.
-- Ele cria o histórico de atualizações e registra quais usuários já visualizaram.

create extension if not exists pgcrypto;

create table if not exists public.system_updates (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  description text,
  notes jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_update_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.barbers(id) on delete cascade,
  update_id uuid not null references public.system_updates(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(user_id, update_id)
);

alter table public.system_updates enable row level security;
alter table public.user_update_views enable row level security;

-- Como o ZenBarber atual usa login próprio em tabela barbers, e não Supabase Auth,
-- estas políticas deixam o front-end ler novidades e registrar visualizações.
-- As tabelas não guardam dados sensíveis; apenas versão e confirmação de leitura.
drop policy if exists "system_updates_read_active" on public.system_updates;
create policy "system_updates_read_active"
on public.system_updates
for select
to anon, authenticated
using (active = true);

drop policy if exists "user_update_views_read" on public.user_update_views;
create policy "user_update_views_read"
on public.user_update_views
for select
to anon, authenticated
using (true);

drop policy if exists "user_update_views_insert" on public.user_update_views;
create policy "user_update_views_insert"
on public.user_update_views
for insert
to anon, authenticated
with check (true);

drop policy if exists "user_update_views_update" on public.user_update_views;
create policy "user_update_views_update"
on public.user_update_views
for update
to anon, authenticated
using (true)
with check (true);

insert into public.system_updates (version, title, description, notes, active, published_at)
values (
  'v1.9.1',
  'Central de Novidades profissional',
  'Agora o ZenBarber mostra novidades vindas do Supabase e registra quem já visualizou cada atualização.',
  '[
    "🔔 Novidades carregadas pelo Supabase, sem precisar editar o código a cada atualização.",
    "👁️ Registro de quais usuários já visualizaram cada novidade.",
    "📋 Histórico profissional de versões na aba Novidades.",
    "✅ Popup aparece apenas para quem ainda não viu a atualização."
  ]'::jsonb,
  true,
  now()
)
on conflict (version) do update set
  title = excluded.title,
  description = excluded.description,
  notes = excluded.notes,
  active = excluded.active,
  published_at = excluded.published_at;
