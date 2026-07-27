-- ZenBarber Pro / NextJumpX — Módulo de Suporte e Chat
-- V2 corrigido: idempotente mesmo se alguma tabela já tiver sido criada parcialmente.
-- Rode no SQL Editor do Supabase antes de subir o ZIP.
-- Não altera agenda, clientes, serviços, financeiro, autenticação ou permissões existentes.

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

-- Garante colunas caso a tabela já exista de uma tentativa anterior incompleta.
alter table public.support_conversations add column if not exists shop_id uuid null;
alter table public.support_conversations add column if not exists shop_name text not null default 'Barbearia';
alter table public.support_conversations add column if not exists barber_id uuid null;
alter table public.support_conversations add column if not exists barber_name text null;
alter table public.support_conversations add column if not exists created_by uuid null;
alter table public.support_conversations add column if not exists anydesk_code text null;
alter table public.support_conversations add column if not exists status text not null default 'aberta';
alter table public.support_conversations add column if not exists last_message_at timestamptz not null default now();
alter table public.support_conversations add column if not exists created_at timestamptz not null default now();
alter table public.support_conversations add column if not exists updated_at timestamptz not null default now();

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
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

alter table public.support_messages add column if not exists conversation_id uuid null;
alter table public.support_messages add column if not exists sender_id uuid null;
alter table public.support_messages add column if not exists sender_name text null;
alter table public.support_messages add column if not exists sender_role text not null default 'barber';
alter table public.support_messages add column if not exists body text null;
alter table public.support_messages add column if not exists attachment_url text null;
alter table public.support_messages add column if not exists status text not null default 'sent';
alter table public.support_messages add column if not exists delivered_at timestamptz null;
alter table public.support_messages add column if not exists read_by_admin_at timestamptz null;
alter table public.support_messages add column if not exists read_by_shop_at timestamptz null;
alter table public.support_messages add column if not exists created_at timestamptz not null default now();

-- Evita duplicar constraint em bancos onde ela já existe.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'support_messages_conversation_id_fkey'
      and conrelid = 'public.support_messages'::regclass
  ) then
    alter table public.support_messages
      add constraint support_messages_conversation_id_fkey
      foreign key (conversation_id)
      references public.support_conversations(id)
      on delete cascade;
  end if;
end $$;

create table if not exists public.support_typing (
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  user_id uuid not null,
  user_name text null,
  user_role text not null default 'barber',
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.support_typing add column if not exists conversation_id uuid null;
alter table public.support_typing add column if not exists user_id uuid null;
alter table public.support_typing add column if not exists user_name text null;
alter table public.support_typing add column if not exists user_role text not null default 'barber';
alter table public.support_typing add column if not exists is_typing boolean not null default false;
alter table public.support_typing add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'support_typing_conversation_id_fkey'
      and conrelid = 'public.support_typing'::regclass
  ) then
    alter table public.support_typing
      add constraint support_typing_conversation_id_fkey
      foreign key (conversation_id)
      references public.support_conversations(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_support_conversations_shop_id on public.support_conversations(shop_id);
create index if not exists idx_support_conversations_last on public.support_conversations(last_message_at desc);
create index if not exists idx_support_messages_conversation on public.support_messages(conversation_id, created_at);
create index if not exists idx_support_messages_unread_admin on public.support_messages(read_by_admin_at) where sender_role <> 'admin';
create index if not exists idx_support_messages_unread_shop on public.support_messages(read_by_shop_at) where sender_role = 'admin';

insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do update set public = true;

-- Realtime: ignora duplicidade se as tabelas já estiverem na publicação.
do $$
begin
  begin alter publication supabase_realtime add table public.support_conversations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.support_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.support_typing; exception when duplicate_object then null; end;
end $$;

-- Observação importante de segurança:
-- O ZenBarber atual usa login próprio em public.barbers no front-end, não Supabase Auth.
-- Por isso, o isolamento forte por RLS depende de migração futura para Supabase Auth ou Edge Functions.
-- Este módulo já grava shop_id/shop_name e o front-end filtra cada barbearia na própria conversa;
-- o Admin Master visualiza todas as conversas pelo painel administrativo.
