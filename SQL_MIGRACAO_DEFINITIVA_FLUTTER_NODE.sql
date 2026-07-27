-- ZenBarber: migracao minima para substituir a versao legada por Flutter + Node.
-- Este arquivo e idempotente e NAO remove tabelas nem dados.
-- Execute no Supabase SQL Editor antes de publicar a nova versao.

begin;

-- 1. Normaliza os valores que o site antigo gravava em ingles.
update public.barbers
set access_status = case lower(coalesce(access_status, ''))
  when 'active' then 'ativo'
  when 'pending' then 'pendente'
  when 'blocked' then 'bloqueado'
  when '' then 'ativo'
  else access_status
end;

alter table public.barbers
  alter column access_status set default 'ativo',
  alter column role set default 'barbeiro';

-- 2. Usa shop_id ja existente como identificador estavel da barbearia.
-- Para cada shop_name, prioriza gerente/dono/admin como registro proprietario.
with owners as (
  select distinct on (shop_name)
    shop_name,
    id as owner_id
  from public.barbers
  where nullif(trim(shop_name), '') is not null
  order by shop_name,
    case lower(coalesce(role, ''))
      when 'gerente' then 0
      when 'manager' then 0
      when 'owner' then 0
      when 'admin' then 1
      when 'admin_master' then 1
      else 2
    end,
    created_at,
    id
)
update public.barbers b
set shop_id = owners.owner_id
from owners
where b.shop_name = owners.shop_name
  and b.shop_id is null;

-- 3. Catalogo: campos usados pela tela Flutter e exclusao logica.
alter table public.services
  add column if not exists icon_text text,
  add column if not exists image_url text,
  add column if not exists active boolean not null default true;

update public.services s
set shop_id = b.shop_id
from public.barbers b
where s.barber_id = b.id
  and s.shop_id is null;

-- 4. Agenda/carteira: valor efetivamente recebido e trilha de alteracoes.
alter table public.appointments
  add column if not exists received_amount numeric(12,2),
  add column if not exists payment_note text,
  add column if not exists cancel_note text,
  add column if not exists updated_at timestamptz default now();

update public.appointments a
set shop_id = b.shop_id
from public.barbers b
where a.barber_id = b.id
  and a.shop_id is null;

with owners as (
  select distinct on (shop_name) shop_name, shop_id
  from public.barbers
  where shop_id is not null and nullif(trim(shop_name), '') is not null
  order by shop_name, created_at, id
)
update public.cash_movements c
set shop_id = owners.shop_id
from owners
where c.shop_name = owners.shop_name
  and c.shop_id is null;

with owners as (
  select distinct on (shop_name) shop_name, shop_id
  from public.barbers
  where shop_id is not null and nullif(trim(shop_name), '') is not null
  order by shop_name, created_at, id
)
update public.cash_closures c
set shop_id = owners.shop_id
from owners
where c.shop_name = owners.shop_name
  and c.shop_id is null;

-- 5. Metas por profissional.
create table if not exists public.barber_business_goals (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete restrict,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  financial_goal numeric(12,2) not null default 0 check (financial_goal >= 0),
  attendance_goal integer not null default 0 check (attendance_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, month_key)
);

-- 6. Historico das acoes de retencao.
create table if not exists public.client_retention_actions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid,
  shop_name text not null,
  barber_id uuid references public.barbers(id) on delete set null,
  client_key text not null,
  client_name text,
  client_phone text,
  action text not null check (
    action in ('whatsapp','agendar','historico','recuperado','observacao')
  ),
  status_level text not null check (
    status_level in ('verde','amarelo','laranja','vermelho')
  ),
  days_without_return integer not null default 0 check (days_without_return >= 0),
  unit_id text default 'all',
  created_by uuid references public.barbers(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.client_retention_actions
  add column if not exists shop_id uuid;

-- 7. Solicitacoes de multiunidade. A aprovacao nao apaga o historico.
create table if not exists public.unit_requests (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references public.barbers(id) on delete set null,
  shop_id uuid,
  manager_name text,
  manager_login text,
  shop_name text,
  unit_name text not null,
  city text not null default '',
  state text not null default '',
  barber_count integer not null default 1 check (barber_count > 0),
  notes text,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.unit_requests
  add column if not exists shop_id uuid;

-- 8. Indices usados pelas consultas do backend.
create index if not exists idx_barbers_shop_id
  on public.barbers (shop_id);
create index if not exists idx_barbers_shop_status
  on public.barbers (shop_id, access_status);
create index if not exists idx_services_shop_barber_active
  on public.services (shop_id, barber_id, active, display_order);
create index if not exists idx_appointments_shop_date
  on public.appointments (shop_id, date, time);
create index if not exists idx_appointments_barber_date_status
  on public.appointments (barber_id, date, status);
create index if not exists idx_appointments_wallet
  on public.appointments (barber_id, status, reminder_date);
create index if not exists idx_goals_barber_month
  on public.barber_business_goals (barber_id, month_key);
create index if not exists idx_retention_shop_client
  on public.client_retention_actions (shop_id, client_key, created_at desc);
create index if not exists idx_unit_requests_manager
  on public.unit_requests (manager_id, created_at desc);
create index if not exists idx_cash_movements_shop_created
  on public.cash_movements (shop_id, created_at desc);
create index if not exists idx_cash_closures_shop_period
  on public.cash_closures (shop_id, period_start desc);

commit;

-- Depois do deploy e do teste dos tres perfis, recomenda-se bloquear o acesso
-- anonimo direto no Supabase e manter escritas apenas pela API com service role.
