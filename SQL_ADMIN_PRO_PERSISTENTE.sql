-- Painel Admin PRO: execute uma vez no Supabase SQL Editor.
-- Os dados de cobrança deixam de ficar no navegador e passam a ser persistentes.
create table if not exists public.admin_account_settings (
  barber_id uuid primary key references public.barbers(id) on delete cascade,
  monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  due_day integer not null default 10 check (due_day between 1 and 28),
  subscription_status text not null default 'ativo'
    check (subscription_status in ('ativo','trial','bonificado','bloqueado')),
  payment_method text not null default 'Pix',
  plan_started_at date,
  plan_ends_at date,
  last_payment_at date,
  bonus_note text,
  internal_note text,
  multiunit_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.set_admin_account_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_admin_account_settings_updated_at on public.admin_account_settings;
create trigger trg_admin_account_settings_updated_at
before update on public.admin_account_settings
for each row execute function public.set_admin_account_settings_updated_at();
