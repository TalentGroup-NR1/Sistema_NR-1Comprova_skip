ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS capa_path text,
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false;