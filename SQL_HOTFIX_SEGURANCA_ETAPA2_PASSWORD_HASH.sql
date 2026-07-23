-- ZenBarber - Segurança Etapa 2
-- Objetivo: parar de depender de senha aberta em texto puro.
-- Rode este SQL no Supabase antes/subindo junto com o ZIP.

alter table public.barbers
add column if not exists password_hash text;

comment on column public.barbers.password_hash is
'Hash da senha do ZenBarber. Hotfix etapa 2 migra senhas antigas no primeiro login e novas senhas passam a ser salvas aqui.';

-- IMPORTANTE:
-- Não apague a coluna password ainda.
-- O app usa compatibilidade temporária para migrar os usuários antigos no primeiro login.
-- Depois de testar todos os acessos, rode uma limpeza controlada:
-- update public.barbers set password = null where password_hash is not null;
