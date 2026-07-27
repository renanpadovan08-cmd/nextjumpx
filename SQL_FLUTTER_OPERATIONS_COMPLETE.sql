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

-- O caixa definitivo reutiliza public.cash_movements e public.cash_closures.
-- Nao crie cash_entries: ela foi substituida pelas tabelas de auditoria acima.
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
