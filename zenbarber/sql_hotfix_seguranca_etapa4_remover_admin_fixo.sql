-- ZenBarber - HOTFIX SEGURANÇA ETAPA 4
-- Remove dependência de admin/senha fixos no JavaScript.
-- Rode no Supabase > SQL Editor ANTES de subir o ZIP, para não perder acesso ao painel Admin.
-- NÃO apaga dados e NÃO ativa RLS.

alter table public.barbers
add column if not exists password_hash text;

alter table public.barbers
add column if not exists must_change_password boolean default false;

-- Cria ou atualiza o usuário Admin Master no banco.
-- Senha inicial: 159753 apenas para migração do ZIP antigo.
-- O app vai obrigar trocar a senha no primeiro acesso por causa de must_change_password = true.
-- Hash gerado pelo padrão atual do app: zb_sha256_v1$ + sha256('ZenBarber|admin|159753|v1')
insert into public.barbers (
  shop_id,
  name,
  login,
  phone,
  shop_name,
  role,
  access_status,
  password_hash,
  password,
  must_change_password,
  work_start,
  work_end,
  off_days,
  commission_rate
)
values (
  coalesce((select shop_id from public.barbers where login = 'admin' limit 1), gen_random_uuid()),
  'Administrador',
  'admin',
  '',
  'ZenBarber Admin',
  'admin_master',
  'ativo',
  'zb_sha256_v1$3e86e2a4a9bbdcb8f8cd0f43f1d1296d94144fa21b5ad3b3b4b794dc38008d0b',
  null,
  true,
  '08:00',
  '20:00',
  '',
  0
)
on conflict (login) do update set
  role = 'admin_master',
  access_status = 'ativo',
  password_hash = excluded.password_hash,
  password = null,
  must_change_password = true;

-- Depois de subir o ZIP e entrar como admin, troque a senha imediatamente.
-- Após validar todos os logins importantes, você pode limpar senhas antigas:
-- update public.barbers set password = null where password_hash is not null;
