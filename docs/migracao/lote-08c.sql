-- ============================================================
-- LOTE 8C — Espelho mensal e tratativas de fechamento
-- Depende de: companies, colaboradores (07B)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.espelhos_ponto_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  ano integer NOT NULL,
  mes integer NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  status text NOT NULL DEFAULT 'fechado',
  horas_trabalhadas_minutos integer NOT NULL DEFAULT 0,
  horas_extras_minutos integer NOT NULL DEFAULT 0,
  horas_noturnas_minutos integer NOT NULL DEFAULT 0,
  horas_abonadas_minutos integer NOT NULL DEFAULT 0,
  saldo_minutos integer NOT NULL DEFAULT 0,
  dias_falta integer NOT NULL DEFAULT 0,
  dias_abonados integer NOT NULL DEFAULT 0,
  snapshot_jsonb jsonb,
  versao integer NOT NULL DEFAULT 1,
  fechado_por uuid,
  fechado_em timestamptz,
  reaberto_por uuid,
  reaberto_em timestamptz,
  motivo_reabertura text,
  assinatura_hash text,
  assinatura_por uuid,
  assinatura_em timestamptz,
  assinatura_ip text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT espelhos_ponto_mensais_mes_check CHECK (mes >= 1 AND mes <= 12),
  CONSTRAINT espelhos_ponto_mensais_status_check CHECK (status = ANY (ARRAY['fechado','reaberto','assinado'])),
  CONSTRAINT ux_espelho_mensal_unico UNIQUE (company_id, colaborador_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS ix_espelho_mensal_colab ON public.espelhos_ponto_mensais (colaborador_id, ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS ix_espelho_mensal_periodo ON public.espelhos_ponto_mensais (company_id, ano DESC, mes DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.espelhos_ponto_mensais TO authenticated;
GRANT ALL ON public.espelhos_ponto_mensais TO service_role;

CREATE TABLE IF NOT EXISTS public.ponto_fechamento_tratativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  saldo_minutos integer NOT NULL,
  acao public.tratativa_saldo_acao NOT NULL,
  observacao text,
  decidido_por uuid NOT NULL,
  decidido_em timestamptz NOT NULL DEFAULT now(),
  ajuste_resumo_data date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_fechamento_tratativas_company_id_colaborador_id_perio_key
    UNIQUE (company_id, colaborador_id, periodo_inicio, periodo_fim)
);

CREATE INDEX IF NOT EXISTS idx_tratativas_company_periodo ON public.ponto_fechamento_tratativas (company_id, periodo_inicio, periodo_fim);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_fechamento_tratativas TO authenticated;
GRANT ALL ON public.ponto_fechamento_tratativas TO service_role;
