-- ============================================================
-- LOTE 8E — Férias e detalhes de risco PGR
-- Depende de: companies, colaboradores (07B), nr1_ghe_riscos (06E)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ferias_periodos_aquisitivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_inicio_aquisitivo date NOT NULL,
  data_fim_aquisitivo date NOT NULL,
  data_limite_gozo date NOT NULL,
  dias_adquiridos integer NOT NULL DEFAULT 30,
  status public.periodo_aquisitivo_status NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ferias_periodos_aquisitivos TO authenticated;
GRANT ALL ON public.ferias_periodos_aquisitivos TO service_role;

CREATE TABLE IF NOT EXISTS public.ferias_gozo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_aquisitivo_id uuid NOT NULL REFERENCES public.ferias_periodos_aquisitivos(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_inicio_gozo date NOT NULL,
  data_fim_gozo date NOT NULL,
  dias_gozados integer NOT NULL,
  data_pagamento date NOT NULL,
  status public.ferias_gozo_status NOT NULL DEFAULT 'planejado',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  abono_pecuniario_dias integer NOT NULL DEFAULT 0,
  solicitado_por uuid,
  aprovado_por uuid,
  aprovado_em timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ferias_gozo TO authenticated;
GRANT ALL ON public.ferias_gozo TO service_role;

CREATE TABLE IF NOT EXISTS public.pgr_risco_detalhes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_ghe_id uuid NOT NULL UNIQUE REFERENCES public.nr1_ghe_riscos(id) ON DELETE CASCADE,
  fundamentacao_legal text DEFAULT '',
  lesoes_agravos text DEFAULT '',
  fontes_circunstancias text DEFAULT '',
  meio_propagacao text DEFAULT '',
  acoes_necessarias text DEFAULT '',
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_risco_detalhes TO authenticated;
GRANT ALL ON public.pgr_risco_detalhes TO service_role;
