-- Garante os campos usados para controlar aprovação de cadastro.
-- Não apaga contas e não altera logins existentes.
alter table public.barbers
  add column if not exists access_status text default 'ativo',
  add column if not exists activation_note text;

-- Marca registros antigos sem status como ativos para não bloquear quem já usa o sistema.
update public.barbers
set access_status = 'ativo'
where access_status is null or access_status = '';
