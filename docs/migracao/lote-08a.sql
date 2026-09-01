-- ============================================================
-- LOTE 8A — Registros de ponto (batidas)
-- Depende de: companies, colaboradores (Lote 7B)
-- ============================================================

-- Função auxiliar usada no índice único de batidas (sem blocos $$)
CREATE OR REPLACE FUNCTION public.minuto_epoch(ts timestamp with time zone)
RETURNS bigint
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path TO 'public', 'pg_temp'
AS 'SELECT (EXTRACT(EPOCH FROM ts AT TIME ZONE ''UTC'')::bigint) / 60';

CREATE TABLE IF NOT EXISTS public.ponto_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  tipo public.ponto_registro_tipo NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  observacao text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  ajuste_manual boolean NOT NULL DEFAULT false,
  ajuste_motivo text,
  ajustado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  status_aprovacao text NOT NULL DEFAULT 'aprovado',
  aprovado_por uuid REFERENCES auth.users(id),
  aprovado_em timestamptz,
  justificativa text,
  exclusao_pendente boolean NOT NULL DEFAULT false,
  exclusao_motivo text,
  exclusao_solicitada_em timestamptz,
  is_auto boolean NOT NULL DEFAULT false,
  auto_reason text
);

CREATE INDEX IF NOT EXISTS idx_ponto_registros_company ON public.ponto_registros (company_id);
CREATE INDEX IF NOT EXISTS idx_ponto_registros_colaborador ON public.ponto_registros (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_registros_data_hora ON public.ponto_registros (data_hora);
CREATE INDEX IF NOT EXISTS ix_ponto_registros_colab_dh ON public.ponto_registros (colaborador_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_ponto_registros_auto ON public.ponto_registros (colaborador_id, data_hora) WHERE (is_auto = true);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ponto_registros_unico_minuto ON public.ponto_registros (colaborador_id, tipo, public.minuto_epoch(data_hora));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_registros TO authenticated;
GRANT ALL ON public.ponto_registros TO service_role;
