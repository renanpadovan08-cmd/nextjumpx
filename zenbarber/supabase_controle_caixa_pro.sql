-- ZenBarber PRO - Controle de Caixa protegido
-- Execute no SQL Editor do Supabase antes de subir o ZIP na Netlify.
-- Este script cria tabelas novas. Não apaga clientes, agenda, serviços ou barbeiros.

create table if not exists public.cash_access_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid null,
  shop_name text not null,
  owner_barber_id uuid null,
  password_hash text not null,
  updated_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid null,
  shop_name text not null,
  type text not null check (type in ('entrada','saida','ajuste')),
  source text not null default 'manual',
  appointment_id uuid null,
  barber_id uuid null,
  client_name text null,
  description text null,
  amount numeric(12,2) not null default 0,
  old_amount numeric(12,2) null,
  new_amount numeric(12,2) null,
  reason text null,
  week_key text null,
  created_by uuid null,
  created_by_name text null,
  cash_closure_id uuid null,
  closed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_closures (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid null,
  shop_name text not null,
  period_start date null,
  period_end date null,
  total_in numeric(12,2) not null default 0,
  total_out numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  closed_by uuid null,
  closed_by_name text null,
  file_name text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_access_shop_id on public.cash_access_settings(shop_id);
create index if not exists idx_cash_access_shop_name on public.cash_access_settings(shop_name);
create index if not exists idx_cash_movements_shop_id on public.cash_movements(shop_id);
create index if not exists idx_cash_movements_shop_name on public.cash_movements(shop_name);
create index if not exists idx_cash_movements_appointment on public.cash_movements(appointment_id);
create index if not exists idx_cash_movements_closed on public.cash_movements(closed_at);
create index if not exists idx_cash_closures_shop_id on public.cash_closures(shop_id);
create index if not exists idx_cash_closures_shop_name on public.cash_closures(shop_name);

alter table public.cash_access_settings enable row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_closures enable row level security;

drop policy if exists "ZenBarber app cash settings access" on public.cash_access_settings;
drop policy if exists "ZenBarber app cash movements access" on public.cash_movements;
drop policy if exists "ZenBarber app cash closures access" on public.cash_closures;

-- O ZenBarber atual usa autenticação própria no frontend com chave publishable/anon.
-- Por isso as permissões do app ficam amplas aqui e o bloqueio real é feito por login + senha do caixa na aplicação.
-- Quando migrar para Supabase Auth, estas policies devem ser endurecidas por auth.uid().
create policy "ZenBarber app cash settings access" on public.cash_access_settings
for all to anon, authenticated using (true) with check (true);

create policy "ZenBarber app cash movements access" on public.cash_movements
for all to anon, authenticated using (true) with check (true);

create policy "ZenBarber app cash closures access" on public.cash_closures
for all to anon, authenticated using (true) with check (true);
