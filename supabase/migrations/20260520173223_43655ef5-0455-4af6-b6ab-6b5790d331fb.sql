ALTER TABLE public.ponto_registros
  ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_ponto_registros_auto
  ON public.ponto_registros(colaborador_id, data_hora)
  WHERE is_auto = true;