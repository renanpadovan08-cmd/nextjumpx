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

create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('entrada','saida')),
  entry_date date not null default current_date,
  created_by uuid references public.barbers(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_cash_entries_shop_date on public.cash_entries(shop_name, entry_date);

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
