
-- Add new columns to colaboradores table
ALTER TABLE public.colaboradores
  ADD COLUMN gestao_tecnica VARCHAR(255) DEFAULT NULL,
  ADD COLUMN is_substituicao BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN substituicao_colaborador_id UUID DEFAULT NULL REFERENCES public.colaboradores(id) ON DELETE SET NULL;

-- Add index for FK
CREATE INDEX idx_colaboradores_substituicao ON public.colaboradores(substituicao_colaborador_id) WHERE substituicao_colaborador_id IS NOT NULL;
