-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versão.
-- A migração é idempotente e pode ser executada novamente com segurança.

begin;

create table if not exists public.cash_recurring_entries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid,
  shop_name text not null,
  unit_id uuid,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null default 'saida' check (type in ('entrada','saida')),
  reason text,
  day_of_month integer not null check (day_of_month between 1 and 31),
  next_run_date date not null,
  active boolean not null default true,
  last_generated_at timestamptz,
  created_by uuid,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid,
  shop_name text not null,
  unit_id uuid,
  movement_id uuid,
  recurring_entry_id uuid,
  action text not null check (
    action in (
      'alteracao',
      'exclusao',
      'recorrencia_criada',
      'recorrencia_desativada'
    )
  ),
  summary text not null,
  old_data jsonb not null default '{}'::jsonb,
  new_data jsonb not null default '{}'::jsonb,
  reason text,
  actor_id uuid,
  actor_name text not null,
  actor_role text,
  created_at timestamptz not null default now()
);

alter table public.cash_movements
  add column if not exists recurring_entry_id uuid,
  add column if not exists recurring_month text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_cash_recurring_due
  on public.cash_recurring_entries (shop_id, active, next_run_date);
create index if not exists idx_cash_recurring_unit_due
  on public.cash_recurring_entries (unit_id, active, next_run_date);
create unique index if not exists idx_cash_recurring_occurrence
  on public.cash_movements (recurring_entry_id, recurring_month)
  where recurring_entry_id is not null and recurring_month is not null;
create index if not exists idx_cash_audit_shop_created
  on public.cash_audit_logs (shop_id, created_at desc);
create index if not exists idx_cash_audit_unit_created
  on public.cash_audit_logs (unit_id, created_at desc);

-- Estas tabelas são acessadas somente pela API com service role.
-- Isso impede que o navegador apague ou adultere o histórico diretamente.
alter table public.cash_recurring_entries enable row level security;
alter table public.cash_audit_logs enable row level security;

commit;
