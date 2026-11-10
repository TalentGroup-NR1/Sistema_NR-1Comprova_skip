-- ============================================================
-- LOTE 6D — Estrutura organizacional / SST: departamentos, setores, GHEs
-- Depende de: companies (Lote 1), unidades_organizacionais (Lote 2B)
-- OBS: a FK departamentos.responsavel_id -> colaboradores é criada
--      no lote-06f.sql (após a criação da tabela colaboradores).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  unidade_id uuid REFERENCES public.unidades_organizacionais(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  codigo text,
  responsavel_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departamentos_company ON public.departamentos (company_id);
CREATE INDEX IF NOT EXISTS idx_departamentos_unidade ON public.departamentos (unidade_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departamentos TO authenticated;
GRANT ALL ON public.departamentos TO service_role;

CREATE TABLE IF NOT EXISTS public.setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  departamento_id uuid NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  ambiente_fisico text,
  andar text,
  localizacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_setores_company ON public.setores (company_id);
CREATE INDEX IF NOT EXISTS idx_setores_departamento ON public.setores (departamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;

DO $$ BEGIN
  CREATE TYPE public.tipo_exposicao AS ENUM ('continua','intermitente','eventual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ghes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  setor_id uuid REFERENCES public.setores(id) ON DELETE RESTRICT,
  codigo text,
  nome text NOT NULL,
  descricao text,
  tipo_exposicao public.tipo_exposicao NOT NULL DEFAULT 'continua'::public.tipo_exposicao,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghes_company ON public.ghes (company_id);
CREATE INDEX IF NOT EXISTS idx_ghes_setor ON public.ghes (setor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghes TO authenticated;
GRANT ALL ON public.ghes TO service_role;
