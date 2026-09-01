ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS humanguide_notas TEXT,
ADD COLUMN IF NOT EXISTS humanguide_path TEXT;