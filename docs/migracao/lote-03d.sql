-- =====================================================================
-- LOTE 3D — questionarios_cuidar_plus, psico_instrumentos, pulse_campaigns,
--           pgr_documentos, nr1_regras_sugestao
-- Pré-requisito: lote-03c.sql e nr1_riscos_catalogo (Lote 2D) aplicados.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.questionarios_cuidar_plus (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  titulo character varying(255) NOT NULL,
  descricao text,
  is_active boolean DEFAULT false NOT NULL,
  data_ativacao timestamp with time zone,
  data_desativacao timestamp with time zone,
  created_by_user_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  modelo_analise text DEFAULT 'PADRAO'::text NOT NULL,
  escala_config jsonb DEFAULT '[{"valor": 1, "rotulo": "Discordo Totalmente"}, {"valor": 2, "rotulo": "Discordo"}, {"valor": 3, "rotulo": "Neutro"}, {"valor": 4, "rotulo": "Concordo"}, {"valor": 5, "rotulo": "Concordo Totalmente"}]'::jsonb,
  config_calculo jsonb DEFAULT '{"limite_risco": 2, "alerta_queda_delta": 0.3, "alerta_media_minima": 3.0, "alerta_risco_percentual": 35}'::jsonb,
  CONSTRAINT questionarios_cuidar_plus_pkey PRIMARY KEY (id),
  CONSTRAINT questionarios_modelo_analise_check CHECK (modelo_analise = ANY (ARRAY['PADRAO'::text, 'MATRIZ_RISCOS'::text])),
  CONSTRAINT questionarios_cuidar_plus_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_questionarios_cuidar_plus_company ON public.questionarios_cuidar_plus USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_questionarios_cuidar_plus_active ON public.questionarios_cuidar_plus USING btree (is_active, company_id);

CREATE TABLE IF NOT EXISTS public.psico_instrumentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid,
  nome character varying(150) NOT NULL,
  versao character varying(30) DEFAULT '1.0'::character varying NOT NULL,
  descricao text,
  referencia_cientifica text,
  editavel boolean DEFAULT true NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT psico_instrumentos_pkey PRIMARY KEY (id),
  CONSTRAINT psico_instrumentos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.pulse_campaigns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  titulo character varying(200) NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tipo text DEFAULT 'manual'::text NOT NULL,
  origem text DEFAULT 'manual'::text NOT NULL,
  template_key text,
  semana_iso integer,
  mes integer,
  ano integer,
  CONSTRAINT pulse_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT pulse_campaigns_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pulse_campaigns_company ON public.pulse_campaigns USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_pulse_campaigns_ativo ON public.pulse_campaigns USING btree (ativo);
CREATE INDEX IF NOT EXISTS idx_pulse_campaigns_dates ON public.pulse_campaigns USING btree (data_inicio, data_fim);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pulse_campaigns_auto_semanal ON public.pulse_campaigns USING btree (company_id, ano, semana_iso) WHERE (origem = 'auto_semanal'::text);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pulse_campaigns_auto_mensal ON public.pulse_campaigns USING btree (company_id, ano, mes) WHERE (origem = 'auto_mensal'::text);

CREATE TABLE IF NOT EXISTS public.pgr_documentos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  titulo text DEFAULT 'Programa de Gerenciamento de Riscos (PGR)'::text NOT NULL,
  vigencia_inicio date,
  vigencia_fim date,
  cnae text,
  grau_risco text,
  endereco text,
  responsavel_tecnico jsonb DEFAULT '{}'::jsonb NOT NULL,
  anexo_art_path text,
  status text DEFAULT 'rascunho'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT pgr_documentos_pkey PRIMARY KEY (id),
  CONSTRAINT pgr_documentos_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.nr1_regras_sugestao (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  risco_catalogo_id uuid,
  campo_busca character varying(30),
  palavras_chave text,
  probabilidade_sugerida integer DEFAULT 3 NOT NULL,
  severidade_sugerida integer DEFAULT 3 NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_regras_sugestao_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_regras_sugestao_probabilidade_sugerida_check CHECK (probabilidade_sugerida >= 1 AND probabilidade_sugerida <= 5),
  CONSTRAINT nr1_regras_sugestao_severidade_sugerida_check CHECK (severidade_sugerida >= 1 AND severidade_sugerida <= 5),
  CONSTRAINT nr1_regras_sugestao_risco_catalogo_id_fkey FOREIGN KEY (risco_catalogo_id) REFERENCES public.nr1_riscos_catalogo(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_nr1_regras_sugestao_risco ON public.nr1_regras_sugestao USING btree (risco_catalogo_id) WHERE ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionarios_cuidar_plus TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psico_instrumentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pgr_documentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_regras_sugestao TO authenticated;
GRANT ALL ON public.questionarios_cuidar_plus, public.psico_instrumentos, public.pulse_campaigns,
  public.pgr_documentos, public.nr1_regras_sugestao TO service_role;
