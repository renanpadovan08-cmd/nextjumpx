-- ZenBarber / NextJumpX — Módulo Retenção: Clientes para Recuperar
-- Execute no Supabase SQL Editor.
-- O módulo usa appointments concluídos como fonte principal e esta tabela registra ações de retenção.

create table if not exists public.client_retention_actions (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  barber_id uuid null,
  client_key text not null,
  client_name text,
  client_phone text,
  action text not null check (action in ('whatsapp','agendar','historico','recuperado','observacao')),
  status_level text not null check (status_level in ('verde','amarelo','laranja','vermelho')),
  days_without_return integer not null default 0,
  unit_id text default 'all',
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_retention_actions_shop_created on public.client_retention_actions (shop_name, created_at desc);
create index if not exists idx_retention_actions_barber_created on public.client_retention_actions (barber_id, created_at desc);
create index if not exists idx_retention_actions_client on public.client_retention_actions (shop_name, client_key, created_at desc);

-- Índices recomendados para acelerar o cálculo de clientes ausentes em bases grandes.
create index if not exists idx_appointments_retention_lookup on public.appointments (barber_id, status, date desc, time desc);
create index if not exists idx_appointments_client_phone_done on public.appointments (client_phone, status, date desc) where status = 'concluido';
create index if not exists idx_appointments_client_name_done on public.appointments (client_name, status, date desc) where status = 'concluido';
