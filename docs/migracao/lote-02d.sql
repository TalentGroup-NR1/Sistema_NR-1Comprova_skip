-- =====================================================================
-- LOTE 2D — nr1_matriz_config, nr1_proart_ativacoes, nr1_proart_perguntas, nr1_riscos_catalogo
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.nr1_matriz_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  corte_verde integer DEFAULT 4 NOT NULL,
  corte_amarelo integer DEFAULT 9 NOT NULL,
  corte_laranja integer DEFAULT 14 NOT NULL,
  corte_vermelho integer DEFAULT 25 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_matriz_config_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_matriz_config_company_id_key UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS public.nr1_proart_ativacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  titulo text DEFAULT 'Avaliação PROART'::text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tamanho_censo integer DEFAULT 0 NOT NULL,
  CONSTRAINT nr1_proart_ativacoes_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_proart_ativacoes_datas_check CHECK (data_fim >= data_inicio)
);
CREATE INDEX IF NOT EXISTS idx_nr1_proart_ativacoes_company ON public.nr1_proart_ativacoes USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.nr1_proart_perguntas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  escala integer NOT NULL,
  numero integer NOT NULL,
  texto text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_proart_perguntas_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_proart_perguntas_escala_numero_key UNIQUE (escala, numero),
  CONSTRAINT nr1_proart_perguntas_escala_check CHECK (escala >= 1 AND escala <= 4)
);

CREATE TABLE IF NOT EXISTS public.nr1_riscos_catalogo (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid,
  nome character varying(200) NOT NULL,
  categoria character varying(30) NOT NULL,
  descricao text,
  fatores_risco text,
  medidas_controle text,
  palavras_chave text,
  editavel boolean DEFAULT true NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT nr1_riscos_catalogo_pkey PRIMARY KEY (id),
  CONSTRAINT nr1_riscos_catalogo_categoria_chk CHECK ((categoria)::text = ANY ((ARRAY['fisico'::character varying, 'quimico'::character varying, 'biologico'::character varying, 'ergonomico'::character varying, 'psicossocial'::character varying, 'acidente'::character varying])::text[]))
);
CREATE INDEX IF NOT EXISTS idx_nr1_riscos_catalogo_company ON public.nr1_riscos_catalogo USING btree (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_matriz_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_proart_ativacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_proart_perguntas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr1_riscos_catalogo TO authenticated;
GRANT ALL ON public.nr1_matriz_config, public.nr1_proart_ativacoes, public.nr1_proart_perguntas, public.nr1_riscos_catalogo TO service_role;

-- Leitura anônima necessária para formulários públicos (PROART por token):
GRANT SELECT ON public.nr1_proart_perguntas TO anon;
