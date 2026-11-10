ALTER TABLE public.campanhas_comunicados
ADD COLUMN IF NOT EXISTS materiais JSONB NOT NULL DEFAULT '[]'::jsonb;