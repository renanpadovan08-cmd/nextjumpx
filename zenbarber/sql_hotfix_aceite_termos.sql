ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;

ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;

ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS accepted_terms_version TEXT;
