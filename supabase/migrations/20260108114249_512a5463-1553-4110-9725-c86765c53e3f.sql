-- Add gestor_id relationship to colaboradores (manager)
ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS gestor_id uuid NULL;

-- Foreign key to colaboradores.id (self-reference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'colaboradores_gestor_id_fkey'
  ) THEN
    ALTER TABLE public.colaboradores
    ADD CONSTRAINT colaboradores_gestor_id_fkey
    FOREIGN KEY (gestor_id)
    REFERENCES public.colaboradores(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_colaboradores_gestor_id ON public.colaboradores (gestor_id);
