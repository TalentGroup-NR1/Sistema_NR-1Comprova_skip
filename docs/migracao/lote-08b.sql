-- ============================================================
-- LOTE 8B — Resumo diário e abonos
-- Depende de: companies, colaboradores (07B), ponto_tipos_abono (03)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ponto_resumo_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  data date NOT NULL,
  horas_previstas_minutos integer NOT NULL DEFAULT 480,
  horas_trabalhadas_minutos integer NOT NULL DEFAULT 0,
  horas_noturnas_minutos integer NOT NULL DEFAULT 0,
  horas_extras_minutos integer NOT NULL DEFAULT 0,
  horas_intervalo_minutos integer NOT NULL DEFAULT 0,
  saldo_minutos integer NOT NULL DEFAULT 0,
  status public.ponto_resumo_status NOT NULL DEFAULT 'REGULAR',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_resumo_diario_colaborador_id_data_key UNIQUE (colaborador_id, data)
);

CREATE INDEX IF NOT EXISTS idx_ponto_resumo_diario_data ON public.ponto_resumo_diario (data);
CREATE INDEX IF NOT EXISTS idx_ponto_resumo_diario_colaborador ON public.ponto_resumo_diario (colaborador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_resumo_diario TO authenticated;
GRANT ALL ON public.ponto_resumo_diario TO service_role;

CREATE TABLE IF NOT EXISTS public.ponto_abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo_abono_id uuid NOT NULL REFERENCES public.ponto_tipos_abono(id) ON DELETE RESTRICT,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  justificativa text NOT NULL,
  anexo_url text,
  anexo_nome text,
  status text NOT NULL DEFAULT 'ativo',
  motivo_cancelamento text,
  lancado_por uuid REFERENCES auth.users(id),
  lancado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  modalidade text NOT NULL DEFAULT 'dia',
  hora_inicio time,
  hora_fim time,
  minutos_abonados integer,
  CONSTRAINT ponto_abonos_check CHECK (data_fim >= data_inicio),
  CONSTRAINT ponto_abonos_status_check CHECK (status = ANY (ARRAY['ativo','cancelado'])),
  CONSTRAINT ponto_abonos_modalidade_check CHECK (
    (modalidade = 'dia' AND hora_inicio IS NULL AND hora_fim IS NULL AND minutos_abonados IS NULL)
    OR (modalidade = 'horas' AND hora_inicio IS NOT NULL AND hora_fim IS NOT NULL AND hora_fim > hora_inicio
        AND data_inicio = data_fim AND minutos_abonados IS NOT NULL AND minutos_abonados > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_ponto_abonos_company ON public.ponto_abonos (company_id);
CREATE INDEX IF NOT EXISTS idx_ponto_abonos_colaborador ON public.ponto_abonos (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_abonos_periodo ON public.ponto_abonos (data_inicio, data_fim);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_abonos TO authenticated;
GRANT ALL ON public.ponto_abonos TO service_role;
