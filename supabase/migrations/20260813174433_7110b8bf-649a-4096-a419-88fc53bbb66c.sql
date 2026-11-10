ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#C8102E',
  ADD COLUMN IF NOT EXISTS brand_favicon_url text,
  ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;

UPDATE public.companies
SET brand_name = COALESCE(brand_name, 'Gestão Ativa'),
    brand_logo_url = COALESCE(brand_logo_url, logo_url, 'https://eocoderzvnycieaesjsv.supabase.co/storage/v1/object/public/logos/b496582a-fe27-4131-a6fc-bc540f470100/logo.png'),
    brand_primary_color = COALESCE(brand_primary_color, primary_color, '#C8102E'),
    is_internal = true
WHERE id IN ('fcdfc7aa-f768-4547-82eb-a8bf583ff756', 'b496582a-fe27-4131-a6fc-bc540f470100');