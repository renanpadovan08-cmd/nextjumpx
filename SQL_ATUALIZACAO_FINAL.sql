-- Rode este SQL uma vez no Supabase antes de subir/usar esta versão.
-- Ele corrige o erro "access_status column" e cria o campo de observação da solicitação.

alter table barbers
add column if not exists role text default 'barber',
add column if not exists access_status text default 'ativo',
add column if not exists activation_note text,
add column if not exists expires_at text,
add column if not exists commission_rate numeric default 0,
add column if not exists work_start text default '08:00',
add column if not exists work_end text default '20:00',
add column if not exists break_start text,
add column if not exists break_end text,
add column if not exists off_days text default '',
add column if not exists photo_url text,
add column if not exists background_url text;

update barbers set access_status = 'ativo' where access_status is null;
