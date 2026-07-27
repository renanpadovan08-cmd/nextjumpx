-- HOTFIX: ordem manual dos serviços no catálogo
-- Rode no Supabase caso queira que a ordem arrastada pelo gerente apareça igual para todos os aparelhos e no link público.
alter table public.services
  add column if not exists display_order integer default 9999;

create index if not exists idx_services_barber_display_order
  on public.services (barber_id, display_order);
