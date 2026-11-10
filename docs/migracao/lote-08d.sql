-- ============================================================
-- LOTE 8D — Fechamentos de banco de horas e auditoria
-- Depende de: companies, colaboradores (07B)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.banco_horas_fechamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  saldo_minutos integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto',
  observacao text,
  created_at timestamptz DEFAULT now(),
  fechado_por uuid REFERENCES auth.users(id),
  fechado_em timestamptz,
  reaberto_por uuid REFERENCES auth.users(id),
  reaberto_em timestamptz,
  motivo_reabertura text,
  snapshot_jsonb jsonb,
  hash_assinatura text,
  pdf_url text,
  csv_url text,
  horas_trabalhadas_minutos integer NOT NULL DEFAULT 0,
  horas_extras_minutos integer NOT NULL DEFAULT 0,
  horas_noturnas_minutos integer NOT NULL DEFAULT 0,
  horas_abonadas_minutos integer NOT NULL DEFAULT 0,
  dias_falta integer NOT NULL DEFAULT 0,
  dias_abonados integer NOT NULL DEFAULT 0,
  versao integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  assinatura_por uuid REFERENCES auth.users(id),
  assinatura_em timestamptz,
  assinatura_hash text,
  tratativa_acao public.tratativa_saldo_acao,
  tratativa_observacao text,
  CONSTRAINT banco_horas_fechamentos_status_check CHECK (status = ANY (ARRAY['aberto','fechado','reaberto','assinado']))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_banco_horas_fechamentos_unico ON public.banco_horas_fechamentos (company_id, colaborador_id, periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS ix_banco_horas_fechamentos_periodo ON public.banco_horas_fechamentos (company_id, periodo_fim DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_horas_fechamentos TO authenticated;
GRANT ALL ON public.banco_horas_fechamentos TO service_role;

CREATE TABLE IF NOT EXISTS public.banco_horas_fechamentos_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.banco_horas_fechamentos(id) ON DELETE CASCADE,
  acao text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banco_horas_fechamentos_auditoria_acao_check CHECK (acao = ANY (ARRAY['fechou','reabriu','refechou','exportou','assinou']))
);

CREATE INDEX IF NOT EXISTS ix_fechamentos_auditoria_fechamento ON public.banco_horas_fechamentos_auditoria (fechamento_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_horas_fechamentos_auditoria TO authenticated;
GRANT ALL ON public.banco_horas_fechamentos_auditoria TO service_role;
