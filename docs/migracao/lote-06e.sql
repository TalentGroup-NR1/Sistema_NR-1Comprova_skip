-- ============================================================
-- LOTE 6E — Cargos, EPIs, riscos por GHE e vínculo avaliação x GHE
-- Depende de: ghes (Lote 6D), nr1_riscos_catalogo (Lote 2D),
--             psico_avaliacoes (Lote 5C)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  ghe_id uuid REFERENCES public.ghes(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cbo_codigo text,
  cbo_descricao text,
  tarefa_prescrita text,
  tarefa_real text,
  descricao_atividades text,
  carga_horaria_semanal numeric,
  tempo_exposicao_horas_dia numeric,
  risco_exposicao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cargos_company ON public.cargos (company_id);
CREATE INDEX IF NOT EXISTS idx_cargos_ghe ON public.cargos (ghe_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;
GRANT ALL ON public.cargos TO service_role;

CREATE TABLE IF NOT EXISTS public.ghe_epis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE CASCADE,
  nome_epi text NOT NULL,
  ca_numero text,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghe_epis_ghe ON public.ghe_epis (ghe_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghe_epis TO authenticated;
GRANT ALL ON public.ghe_epis TO service_role;

CREATE TABLE IF NOT EXISTS public.nr1_ghe_riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  risco_id uuid REFERENCES public.nr1_riscos_catalogo(id) ON DELETE SET NULL,
  nome_risco varchar(200) NOT NULL,
  categoria varchar(30) NOT NULL,
  probabilidade integer NOT NULL,
  severidade integer NOT NULL,
  nivel_risco integer GENERATED ALWAYS AS (probabilidade * severidade) STORED,
  fonte varchar(30) NOT NULL DEFAULT 'manual'::varchar,
  origem_dados text,
  descricao text,
  controles_existentes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr1_ghe_riscos_categoria_chk CHECK (categoria::text = ANY (ARRAY['fisico','quimico','biologico','ergonomico','psicossocial','acidente'])),
  CONSTRAINT nr1_ghe_riscos_fonte_chk CHECK (fonte::text = ANY (ARRAY['manual','automatico','psicossocial'])),
  CONSTRAINT nr1_ghe_riscos_probabilidade_check CHECK (probabilidade >= 1 AND probabilidade <= 5),
  CONSTRAINT nr1_ghe_riscos_severidade_check CHECK (severidade >= 1 AND severidade <= 5)
);

CREATE INDEX IF NOT EXISTS idx_nr1_ghe_riscos_ghe ON public.nr1_ghe_riscos (ghe_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS idx_nr1_ghe_riscos_company ON public.nr1_ghe_riscos (company_id) WHERE ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_ghe_riscos TO authenticated;
GRANT ALL ON public.nr1_ghe_riscos TO service_role;

CREATE TABLE IF NOT EXISTS public.psico_avaliacao_ghes (
  avaliacao_id uuid NOT NULL REFERENCES public.psico_avaliacoes(id) ON DELETE CASCADE,
  ghe_id uuid NOT NULL REFERENCES public.ghes(id) ON DELETE RESTRICT,
  PRIMARY KEY (avaliacao_id, ghe_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_avaliacao_ghes TO authenticated;
GRANT ALL ON public.psico_avaliacao_ghes TO service_role;
