
ALTER TABLE public.nr1_proart_ativacoes
  ADD COLUMN IF NOT EXISTS tamanho_censo integer NOT NULL DEFAULT 0;

ALTER TABLE public.nr1_proart_respostas
  ADD COLUMN IF NOT EXISTS modalidade_trabalho text,
  ADD COLUMN IF NOT EXISTS pcd boolean;

ALTER TABLE public.nr1_proart_respostas
  DROP CONSTRAINT IF EXISTS nr1_proart_respostas_modalidade_trabalho_check;

ALTER TABLE public.nr1_proart_respostas
  ADD CONSTRAINT nr1_proart_respostas_modalidade_trabalho_check
  CHECK (modalidade_trabalho IS NULL OR modalidade_trabalho IN ('Presencial','Remoto','Híbrido'));
