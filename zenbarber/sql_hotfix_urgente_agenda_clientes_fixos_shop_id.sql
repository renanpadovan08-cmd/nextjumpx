-- HOTFIX URGENTE ZenBarber
-- Corrige agendamentos/clientes fixos que foram criados sem shop_id.
-- Rode no Supabase SQL Editor antes de subir o ZIP, ou logo depois.

ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS shop_id UUID;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS shop_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS shop_id UUID;

-- Garante shop_id para barbearias antigas agrupando pelo nome da barbearia.
WITH shops AS (
  SELECT lower(trim(shop_name)) AS shop_key, gen_random_uuid() AS new_shop_id
  FROM public.barbers
  WHERE shop_name IS NOT NULL AND trim(shop_name) <> '' AND shop_id IS NULL
  GROUP BY lower(trim(shop_name))
)
UPDATE public.barbers b
SET shop_id = shops.new_shop_id
FROM shops
WHERE b.shop_id IS NULL
  AND lower(trim(b.shop_name)) = shops.shop_key;

UPDATE public.barbers
SET shop_id = gen_random_uuid()
WHERE shop_id IS NULL;

-- Repara serviços criados por cliente fixo/assinatura sem shop_id.
UPDATE public.services s
SET shop_id = b.shop_id
FROM public.barbers b
WHERE s.barber_id = b.id
  AND s.shop_id IS NULL;

-- Repara agendamentos e clientes fixos salvos sem shop_id.
UPDATE public.appointments a
SET shop_id = b.shop_id
FROM public.barbers b
WHERE a.barber_id = b.id
  AND a.shop_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_barbers_shop_id ON public.barbers(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON public.appointments(shop_id);
