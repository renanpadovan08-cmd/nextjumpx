-- HOTFIX opcional: visual premium dos serviços no link público
-- Rode no Supabase para permitir salvar ícone curto e foto do serviço.
alter table public.services add column if not exists icon_text text;
alter table public.services add column if not exists image_url text;
