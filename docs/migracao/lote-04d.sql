-- ============================================================
-- LOTE 4D — Cuidar+ (badges/recomendações), questionário Cuidar+ e Pulse
-- Depende de: companies (Lote 1), pulse_campaigns e questionarios_cuidar_plus (Lote 3D)
-- ============================================================

-- 1) cuidar_badges
CREATE TABLE IF NOT EXISTS public.cuidar_badges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  campanha_id     uuid REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  badge_tipo      text NOT NULL,
  badge_label     text NOT NULL,
  badge_descricao text NOT NULL,
  score           numeric(5,2),
  ano             integer,
  semana_iso      integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cuidar_badges_user_id_campanha_id_badge_tipo_key UNIQUE (user_id, campanha_id, badge_tipo)
);
CREATE INDEX IF NOT EXISTS idx_cuidar_badges_company_semana ON public.cuidar_badges (company_id, ano, semana_iso);
CREATE INDEX IF NOT EXISTS idx_cuidar_badges_user_created ON public.cuidar_badges (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_badges TO authenticated;
GRANT ALL ON public.cuidar_badges TO service_role;

-- 2) cuidar_recomendacoes
CREATE TABLE IF NOT EXISTS public.cuidar_recomendacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  campanha_id  uuid REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  contexto     text NOT NULL,
  recomendacao text NOT NULL,
  tipo         text NOT NULL,
  score        numeric(5,2),
  ano          integer,
  semana_iso   integer,
  departamento text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cuidar_recomendacoes_contexto_check CHECK (contexto = ANY (ARRAY['colaborador','gestor'])),
  CONSTRAINT cuidar_recomendacoes_user_id_campanha_id_tipo_contexto_key
    UNIQUE (user_id, campanha_id, tipo, contexto)
);
CREATE INDEX IF NOT EXISTS idx_cuidar_recomendacoes_company_semana ON public.cuidar_recomendacoes (company_id, ano, semana_iso);
CREATE INDEX IF NOT EXISTS idx_cuidar_recomendacoes_user_created ON public.cuidar_recomendacoes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cuidar_recomendacoes_contexto ON public.cuidar_recomendacoes (company_id, contexto, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuidar_recomendacoes TO authenticated;
GRANT ALL ON public.cuidar_recomendacoes TO service_role;

-- 3) dimensoes_questionario_cuidar_plus
CREATE TABLE IF NOT EXISTS public.dimensoes_questionario_cuidar_plus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id uuid NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  codigo          varchar(10) NOT NULL,
  titulo          varchar(200) NOT NULL,
  descricao       text,
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dimensoes_questionario_id
  ON public.dimensoes_questionario_cuidar_plus (questionario_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dimensoes_questionario_cuidar_plus TO authenticated;
GRANT ALL ON public.dimensoes_questionario_cuidar_plus TO service_role;

-- 4) perguntas_cuidar_plus
CREATE TABLE IF NOT EXISTS public.perguntas_cuidar_plus (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionario_id          uuid NOT NULL REFERENCES public.questionarios_cuidar_plus(id) ON DELETE CASCADE,
  pergunta_texto           text NOT NULL,
  tipo_pergunta            varchar(50) NOT NULL,
  order_index              integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  escala_config            jsonb,
  dimensao                 text,
  dimensao_questionario_id uuid REFERENCES public.dimensoes_questionario_cuidar_plus(id) ON DELETE SET NULL,
  is_invertida             boolean NOT NULL DEFAULT false,
  bloco                    text,
  peso                     numeric NOT NULL DEFAULT 1,
  CONSTRAINT perguntas_cuidar_plus_tipo_pergunta_check
    CHECK (tipo_pergunta::text = ANY (ARRAY['LIKERT_5','TEXTO_LIVRE']))
);
CREATE INDEX IF NOT EXISTS idx_perguntas_cuidar_plus_ordem
  ON public.perguntas_cuidar_plus (questionario_id, order_index);
CREATE INDEX IF NOT EXISTS idx_perguntas_dimensao_questionario_id
  ON public.perguntas_cuidar_plus (dimensao_questionario_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perguntas_cuidar_plus TO authenticated;
GRANT ALL ON public.perguntas_cuidar_plus TO service_role;

-- 5) pulse_questions
CREATE TABLE IF NOT EXISTS public.pulse_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  pergunta    text NOT NULL,
  tipo        public.pulse_question_type NOT NULL DEFAULT 'escala_0_5'::public.pulse_question_type,
  ordem       integer NOT NULL DEFAULT 0,
  obrigatoria boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pulse_questions_campaign ON public.pulse_questions (campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_questions TO authenticated;
GRANT ALL ON public.pulse_questions TO service_role;
