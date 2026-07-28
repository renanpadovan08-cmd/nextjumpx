-- ZenBarber Flutter/Node: operações financeiras e carteira.
-- Execute uma vez no Supabase SQL Editor antes de publicar esta versão.
alter table public.appointments
  add column if not exists reminder_days integer,
  add column if not exists reminder_date date,
  add column if not exists received_amount numeric(12,2),
  add column if not exists payment_note text,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_appointments_wallet
  on public.appointments (barber_id, status, reminder_date);

-- O caixa definitivo reutiliza as tabelas de auditoria da main e tambem as
-- cria quando este complemento for aplicado em uma instalacao nova.
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid,
  shop_name text not null,
  type text not null check (type in ('entrada','saida','ajuste')),
  source text not null default 'manual',
  appointment_id uuid,
  barber_id uuid,
  client_name text,
  description text,
  amount numeric(12,2) not null default 0,
  old_amount numeric(12,2),
  new_amount numeric(12,2),
  reason text,
  week_key text,
  created_by uuid,
  created_by_name text,
  cash_closure_id uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.cash_closures (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid,
  shop_name text not null,
  period_start date,
  period_end date,
  total_in numeric(12,2) not null default 0,
  total_out numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  closed_by uuid,
  closed_by_name text,
  file_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cash_movements_shop_created
  on public.cash_movements(shop_id, created_at desc);
create index if not exists idx_cash_closures_shop_period
  on public.cash_closures(shop_id, period_start desc);

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
create index if not exists idx_retention_actions_shop_client
  on public.client_retention_actions(shop_name, client_key, created_at);
