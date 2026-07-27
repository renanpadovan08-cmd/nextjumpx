-- ZenBarber HOTFIX: Identificador único da barbearia (shop_id)
-- Rode este SQL no Supabase ANTES de subir o ZIP deste hotfix.
-- Ele não apaga dados. Ele apenas cria e preenche o shop_id para preparar o app para RLS futuramente.

ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS shop_id UUID;

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS shop_id UUID;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS shop_id UUID;

-- Cria um shop_id único para cada nome de barbearia existente.
WITH shops AS (
  SELECT
    lower(trim(shop_name)) AS shop_key,
    gen_random_uuid() AS new_shop_id
  FROM public.barbers
  WHERE shop_name IS NOT NULL AND trim(shop_name) <> ''
  GROUP BY lower(trim(shop_name))
)
UPDATE public.barbers b
SET shop_id = shops.new_shop_id
FROM shops
WHERE b.shop_id IS NULL
  AND lower(trim(b.shop_name)) = shops.shop_key;

-- Garante que qualquer barbeiro sem nome de barbearia receba um shop_id próprio.
UPDATE public.barbers
SET shop_id = gen_random_uuid()
WHERE shop_id IS NULL;

-- Espelha o shop_id nos serviços pelo barbeiro dono do serviço.
UPDATE public.services s
SET shop_id = b.shop_id
FROM public.barbers b
WHERE s.barber_id = b.id
  AND s.shop_id IS NULL;

-- Espelha o shop_id nos agendamentos pelo barbeiro responsável.
UPDATE public.appointments a
SET shop_id = b.shop_id
FROM public.barbers b
WHERE a.barber_id = b.id
  AND a.shop_id IS NULL;

-- Índices para performance e futura política RLS.
CREATE INDEX IF NOT EXISTS idx_barbers_shop_id ON public.barbers(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON public.appointments(shop_id);
