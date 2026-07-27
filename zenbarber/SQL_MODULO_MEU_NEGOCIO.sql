-- ZenBarber / NextJumpX — Módulo Meu Negócio
-- Execute no Supabase SQL Editor antes de publicar a versão.

create table if not exists public.barber_business_goals (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  financial_goal numeric(12,2) not null default 0,
  attendance_goal integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, month_key)
);

create index if not exists idx_barber_business_goals_barber_month
  on public.barber_business_goals (barber_id, month_key);

create index if not exists idx_appointments_barber_date_status
  on public.appointments (barber_id, date, status);

create index if not exists idx_appointments_client_lookup
  on public.appointments (barber_id, client_phone, client_name, date);

create index if not exists idx_services_barber_id
  on public.services (barber_id);

alter table public.barber_business_goals enable row level security;

-- Políticas compatíveis com o modelo atual do ZenBarber em front-end estático.
-- Caso seu projeto ainda não use Supabase Auth, mantenha as permissões do anon configuradas como nas demais tabelas.
drop policy if exists "barber_business_goals_select" on public.barber_business_goals;
create policy "barber_business_goals_select"
  on public.barber_business_goals for select
  using (true);

drop policy if exists "barber_business_goals_insert" on public.barber_business_goals;
create policy "barber_business_goals_insert"
  on public.barber_business_goals for insert
  with check (true);

drop policy if exists "barber_business_goals_update" on public.barber_business_goals;
create policy "barber_business_goals_update"
  on public.barber_business_goals for update
  using (true)
  with check (true);
