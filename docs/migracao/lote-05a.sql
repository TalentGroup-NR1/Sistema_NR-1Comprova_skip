-- ============================================================
-- LOTE 5A — Benefícios (dependências: beneficios, companies)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.beneficios_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  tipo varchar(20) NOT NULL,
  titulo varchar(200) NOT NULL,
  arquivo_url varchar(500),
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  link_externo varchar,
  CONSTRAINT beneficios_materiais_tipo_check
    CHECK (tipo::text = ANY (ARRAY['pdf','ppt','video','link']))
);
CREATE INDEX IF NOT EXISTS idx_beneficios_materiais_beneficio_id
  ON public.beneficios_materiais USING btree (beneficio_id);

CREATE TABLE IF NOT EXISTS public.beneficios_departamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  departamento varchar(100) NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_inicio date,
  valor numeric,
  UNIQUE (beneficio_id, departamento)
);

CREATE TABLE IF NOT EXISTS public.beneficios_tipo_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  tipo_contrato varchar NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  data_inicio date,
  valor numeric(12,2)
);

CREATE TABLE IF NOT EXISTS public.beneficios_empresa_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  empresa_cliente text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_inicio date,
  valor numeric,
  UNIQUE (beneficio_id, empresa_cliente)
);
CREATE INDEX IF NOT EXISTS idx_bec_beneficio
  ON public.beneficios_empresa_cliente USING btree (beneficio_id);
CREATE INDEX IF NOT EXISTS idx_bec_company_empresa
  ON public.beneficios_empresa_cliente USING btree (company_id, empresa_cliente);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_materiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_departamento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_tipo_contrato TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_empresa_cliente TO authenticated;
GRANT ALL ON public.beneficios_materiais TO service_role;
GRANT ALL ON public.beneficios_departamento TO service_role;
GRANT ALL ON public.beneficios_tipo_contrato TO service_role;
GRANT ALL ON public.beneficios_empresa_cliente TO service_role;
