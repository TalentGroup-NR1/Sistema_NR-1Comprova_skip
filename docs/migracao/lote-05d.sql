-- ============================================================
-- LOTE 5D — Avaliações / Questions / Planos de Ação NR-1
-- Dependências: ciclos_avaliacao, questionnaire_templates (Lote 3C),
--               nr1_proart_ativacoes (Lote 2D), psico_avaliacoes/dimensoes (5C)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.tipo_metrica AS ENUM ('numerica','descritiva');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM ('ESCALA_NUMERICA','TEXTO_LIVRE','SIM_NAO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.respondent_type AS ENUM ('COLABORADOR','GESTOR','AMBOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.metricas_avaliacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  nome_metrica text NOT NULL,
  tipo_metrica public.tipo_metrica NOT NULL,
  valores_escala jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metricas_avaliacao_ciclo
  ON public.metricas_avaliacao USING btree (ciclo_id);

CREATE TABLE IF NOT EXISTS public.metricas_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metrica_id uuid NOT NULL REFERENCES public.metricas_avaliacao(id) ON DELETE CASCADE,
  valor_label text NOT NULL,
  peso numeric NOT NULL DEFAULT 1,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metrica_id, valor_label)
);

CREATE TABLE IF NOT EXISTS public.competencias_ciclo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  metrica_id uuid REFERENCES public.metricas_avaliacao(id) ON DELETE SET NULL,
  nome_competencia text NOT NULL,
  conceito_competencia text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  texto_pergunta_autoavaliacao text NOT NULL,
  texto_pergunta_gestor text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_competencias_ciclo_ciclo
  ON public.competencias_ciclo USING btree (ciclo_id);

CREATE TABLE IF NOT EXISTS public.objetivos_ciclo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE,
  metrica_id uuid REFERENCES public.metricas_avaliacao(id) ON DELETE SET NULL,
  nome_objetivo text NOT NULL,
  descricao_objetivo text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  texto_pergunta_autoavaliacao text NOT NULL,
  texto_pergunta_gestor text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_objetivos_ciclo_ciclo
  ON public.objetivos_ciclo USING btree (ciclo_id);

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_template_id uuid NOT NULL
    REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type public.question_type NOT NULL,
  scale_min integer DEFAULT 1,
  scale_max integer DEFAULT 10,
  respondent_type public.respondent_type NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metricas_avaliacao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metricas_valores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competencias_ciclo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objetivos_ciclo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.metricas_avaliacao TO service_role;
GRANT ALL ON public.metricas_valores TO service_role;
GRANT ALL ON public.competencias_ciclo TO service_role;
GRANT ALL ON public.objetivos_ciclo TO service_role;
GRANT ALL ON public.questions TO service_role;
