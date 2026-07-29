-- ZenBarber - HOTFIX Solicitações de Unidades / Multiunidade interna
-- Rode este SQL no Supabase para que as solicitações apareçam para o Admin Master em qualquer dispositivo.

create table if not exists public.unit_requests (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references public.barbers(id) on delete set null,
  manager_name text,
  manager_login text,
  shop_name text,
  unit_name text not null,
  city text not null,
  state text not null,
  barber_count integer not null default 1,
  notes text,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.unit_requests enable row level security;

drop policy if exists "unit_requests_insert_public" on public.unit_requests;
create policy "unit_requests_insert_public"
on public.unit_requests
for insert
with check (true);

drop policy if exists "unit_requests_select_public" on public.unit_requests;
create policy "unit_requests_select_public"
on public.unit_requests
for select
using (true);

drop policy if exists "unit_requests_update_public" on public.unit_requests;
create policy "unit_requests_update_public"
on public.unit_requests
for update
using (true)
with check (true);

create or replace function public.set_unit_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_unit_requests_updated_at on public.unit_requests;
create trigger trg_unit_requests_updated_at
before update on public.unit_requests
for each row execute function public.set_unit_requests_updated_at();

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique,
  shop_id uuid,
  shop_name text not null,
  name text not null,
  city text,
  state text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barber_unit_assignments (
  barber_id uuid primary key,
  unit_id uuid not null,
  shop_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_units_shop
  on public.units(shop_id, active, created_at);
create index if not exists idx_barber_unit_assignments_unit
  on public.barber_unit_assignments(unit_id, barber_id);
