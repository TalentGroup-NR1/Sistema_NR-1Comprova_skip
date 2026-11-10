-- =====================================================================
-- LOTE 3C — ciclos_avaliacao, descricao_modelos, questionario_modelos, questionnaire_templates
-- Pré-requisito: lote-03b.sql aplicado.
-- Enums usados: ciclo_avaliacao_status, milestone_type, target_audience_type
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ciclo_avaliacao_status') THEN
    CREATE TYPE public.ciclo_avaliacao_status AS ENUM ('configuracao', 'ativo', 'finalizado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_type') THEN
    CREATE TYPE public.milestone_type AS ENUM ('30_DIAS', '80_DIAS', '120_DIAS', 'GERAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_audience_type') THEN
    CREATE TYPE public.target_audience_type AS ENUM ('COLABORADOR', 'GESTOR', 'AMBOS', 'NAO_ESPECIFICADO');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.ciclos_avaliacao (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome_ciclo text NOT NULL,
  descricao text,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status public.ciclo_avaliacao_status DEFAULT 'configuracao'::public.ciclo_avaliacao_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ciclos_avaliacao_pkey PRIMARY KEY (id),
  CONSTRAINT ciclos_avaliacao_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ciclos_avaliacao_company ON public.ciclos_avaliacao USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_avaliacao_status ON public.ciclos_avaliacao USING btree (status);

CREATE TABLE IF NOT EXISTS public.descricao_modelos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  estrutura jsonb DEFAULT '{"blocos": []}'::jsonb NOT NULL,
  padrao boolean DEFAULT false NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT descricao_modelos_pkey PRIMARY KEY (id),
  CONSTRAINT descricao_modelos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_descricao_modelos_company ON public.descricao_modelos USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.questionario_modelos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  instrucoes text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT questionario_modelos_pkey PRIMARY KEY (id),
  CONSTRAINT questionario_modelos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.questionnaire_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid,
  template_name character varying(255) NOT NULL,
  description text,
  milestone_type public.milestone_type,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  target_audience public.target_audience_type DEFAULT 'NAO_ESPECIFICADO'::public.target_audience_type NOT NULL,
  CONSTRAINT questionnaire_templates_pkey PRIMARY KEY (id),
  CONSTRAINT questionnaire_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ciclos_avaliacao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.descricao_modelos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionario_modelos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_templates TO authenticated;
GRANT ALL ON public.ciclos_avaliacao, public.descricao_modelos, public.questionario_modelos, public.questionnaire_templates TO service_role;
