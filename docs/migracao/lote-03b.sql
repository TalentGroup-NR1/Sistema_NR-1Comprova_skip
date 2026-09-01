-- =====================================================================
-- LOTE 3B — ponto_tipos_abono, ponto_compensacoes, beneficios, categorias_treinamento
-- Pré-requisito: lote-03a.sql aplicado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ponto_tipos_abono (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  dias_maximos_sugeridos integer,
  base_legal text,
  exige_anexo boolean DEFAULT false NOT NULL,
  abona_horas boolean DEFAULT true NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  categoria text DEFAULT 'outros'::text NOT NULL,
  CONSTRAINT ponto_tipos_abono_pkey PRIMARY KEY (id),
  CONSTRAINT ponto_tipos_abono_company_id_codigo_key UNIQUE (company_id, codigo),
  CONSTRAINT ponto_tipos_abono_categoria_check CHECK (categoria = ANY (ARRAY['falta_injustificada'::text, 'atestado_medico'::text, 'atraso'::text, 'saida_antecipada'::text, 'folga'::text, 'ferias'::text, 'outros'::text])),
  CONSTRAINT ponto_tipos_abono_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_ponto_tipos_abono_company ON public.ponto_tipos_abono USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.ponto_compensacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  descricao text NOT NULL,
  total_horas_compensar integer NOT NULL,
  dias_compensacao integer NOT NULL,
  minutos_extras_dia integer GENERATED ALWAYS AS ((total_horas_compensar / NULLIF(dias_compensacao, 0))) STORED,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ponto_compensacoes_pkey PRIMARY KEY (id),
  CONSTRAINT ponto_compensacoes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.beneficios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome character varying(100) NOT NULL,
  descricao text,
  valor_mensal numeric(10,2),
  operadora_fornecedor character varying(200),
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  empresa character varying(200),
  instrucoes text,
  importancia text,
  link_externo character varying(500),
  imagem_capa character varying(500),
  categoria character varying(50) DEFAULT 'outros'::character varying,
  CONSTRAINT beneficios_pkey PRIMARY KEY (id),
  CONSTRAINT beneficios_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.categorias_treinamento (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome character varying(255) NOT NULL,
  descricao text,
  cor character varying(7) DEFAULT '#6366f1'::character varying,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorias_treinamento_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_treinamento_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_tipos_abono TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_compensacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_treinamento TO authenticated;
GRANT ALL ON public.ponto_tipos_abono, public.ponto_compensacoes, public.beneficios, public.categorias_treinamento TO service_role;
