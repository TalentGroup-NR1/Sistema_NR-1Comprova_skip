-- =====================================================================
-- LOTE 2B — unidades_organizacionais, empresas_clientes, niveis_maturidade, feriados
-- Pré-requisito: lote-02a.sql aplicado (enums criados).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.unidades_organizacionais (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  tipo public.unidade_tipo DEFAULT 'matriz'::public.unidade_tipo NOT NULL,
  endereco text,
  cidade text,
  estado text,
  cep text,
  ativa boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unidades_organizacionais_pkey PRIMARY KEY (id),
  CONSTRAINT unidades_organizacionais_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_unidades_company ON public.unidades_organizacionais USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.empresas_clientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  codigo text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT empresas_clientes_pkey PRIMARY KEY (id),
  CONSTRAINT empresas_clientes_company_id_nome_key UNIQUE (company_id, nome),
  CONSTRAINT empresas_clientes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_empresas_clientes_company ON public.empresas_clientes USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.niveis_maturidade (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem integer DEFAULT 0 NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT niveis_maturidade_pkey PRIMARY KEY (id),
  CONSTRAINT niveis_maturidade_company_id_nome_key UNIQUE (company_id, nome),
  CONSTRAINT niveis_maturidade_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_niveis_maturidade_company ON public.niveis_maturidade USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.feriados (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  uf character(2),
  recorrente boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT feriados_pkey PRIMARY KEY (id),
  CONSTRAINT feriados_tipo_check CHECK (tipo = ANY (ARRAY['NACIONAL'::text, 'ESTADUAL'::text, 'MUNICIPAL'::text, 'EMPRESA'::text])),
  CONSTRAINT feriados_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS feriados_unique_idx ON public.feriados USING btree (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), data, nome);
CREATE INDEX IF NOT EXISTS feriados_company_idx ON public.feriados USING btree (company_id);
CREATE INDEX IF NOT EXISTS feriados_data_idx ON public.feriados USING btree (data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades_organizacionais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.niveis_maturidade TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriados TO authenticated;
GRANT ALL ON public.unidades_organizacionais, public.empresas_clientes, public.niveis_maturidade, public.feriados TO service_role;
