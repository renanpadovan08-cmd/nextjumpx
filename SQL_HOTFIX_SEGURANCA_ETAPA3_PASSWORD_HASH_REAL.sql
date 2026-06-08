-- ZenBarber - Segurança Etapa 3
-- Senha segura no fluxo atual do app estático.
-- Rode no Supabase > SQL Editor antes de subir o ZIP.
-- Este SQL NÃO apaga dados e NÃO ativa RLS.

alter table public.barbers
add column if not exists password_hash text;

alter table public.barbers
add column if not exists must_change_password boolean default false;

comment on column public.barbers.password_hash is
'Hash da senha do ZenBarber. O app valida por hash e usa password apenas como migração legada controlada.';

comment on column public.barbers.must_change_password is
'Quando true, o usuário precisa trocar a senha no próximo login.';

-- IMPORTANTE:
-- 1) Não apague a coluna password ainda.
-- 2) Suba o ZIP, teste Admin/Gerente/Barbeiro e faça login uma vez nos usuários importantes.
-- 3) Só depois da validação, rode a limpeza opcional abaixo:
-- update public.barbers set password = null where password_hash is not null;
