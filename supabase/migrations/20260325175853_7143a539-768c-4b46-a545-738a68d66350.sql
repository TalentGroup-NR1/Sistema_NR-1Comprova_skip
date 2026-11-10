
ALTER TABLE public.ponto_registros 
  ADD COLUMN IF NOT EXISTS exclusao_pendente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusao_motivo text,
  ADD COLUMN IF NOT EXISTS exclusao_solicitada_em timestamptz;
