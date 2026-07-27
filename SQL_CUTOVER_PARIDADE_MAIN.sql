-- ZenBarber Flutter + Node.js
-- Migração incremental para paridade com a main.
-- Execute depois de SQL_MIGRACAO_DEFINITIVA_FLUTTER_NODE.sql.

create extension if not exists pgcrypto;

alter table public.barbers
  add column if not exists accepted_terms boolean not null default false,
  add column if not exists accepted_terms_at timestamptz null,
  add column if not exists accepted_terms_version text null;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid null,
  shop_name text not null default 'Barbearia',
  barber_id uuid null,
  barber_name text null,
  created_by uuid null,
  anydesk_code text null,
  status text not null default 'aberta',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_conversations
  add column if not exists shop_id uuid null,
  add column if not exists shop_name text not null default 'Barbearia',
  add column if not exists barber_id uuid null,
  add column if not exists barber_name text null,
  add column if not exists created_by uuid null,
  add column if not exists anydesk_code text null,
  add column if not exists status text not null default 'aberta',
  add column if not exists last_message_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.support_conversations(id) on delete cascade,
  sender_id uuid null,
  sender_name text null,
  sender_role text not null default 'barber',
  body text null,
  attachment_url text null,
  status text not null default 'sent',
  delivered_at timestamptz null,
  read_by_admin_at timestamptz null,
  read_by_shop_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.support_messages
  add column if not exists conversation_id uuid null,
  add column if not exists sender_id uuid null,
  add column if not exists sender_name text null,
  add column if not exists sender_role text not null default 'barber',
  add column if not exists body text null,
  add column if not exists attachment_url text null,
  add column if not exists status text not null default 'sent',
  add column if not exists delivered_at timestamptz null,
  add column if not exists read_by_admin_at timestamptz null,
  add column if not exists read_by_shop_at timestamptz null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_support_conversations_shop_id
  on public.support_conversations(shop_id);
create index if not exists idx_support_conversations_last
  on public.support_conversations(last_message_at desc);
create index if not exists idx_support_messages_conversation
  on public.support_messages(conversation_id, created_at);

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

alter table public.system_updates
  add column if not exists version text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists notes jsonb not null default '[]'::jsonb,
  add column if not exists active boolean not null default true,
  add column if not exists published_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.user_update_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.barbers(id) on delete cascade,
  update_id uuid not null references public.system_updates(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(user_id, update_id)
);

alter table public.user_update_views
  add column if not exists user_id uuid null,
  add column if not exists update_id uuid null,
  add column if not exists viewed_at timestamptz not null default now();

create unique index if not exists idx_system_updates_version
  on public.system_updates(version);
create unique index if not exists idx_user_update_views_user_update
  on public.user_update_views(user_id, update_id);

insert into public.system_updates
  (version, title, description, notes, active, published_at)
values (
  'v2.0.0',
  'ZenBarber Flutter + Node.js',
  'Nova arquitetura com API segura, aplicativo Flutter e paridade com a versão principal.',
  '[
    "Login legado compatível com migração automática para BCrypt.",
    "Termos de Uso obrigatórios e registrados por usuário.",
    "Chat de suporte persistente entre a barbearia e o administrador.",
    "Central de Novidades com histórico e confirmação de leitura."
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
