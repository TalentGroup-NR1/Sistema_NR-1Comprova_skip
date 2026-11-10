-- =====================================================================
-- MIGRAÇÃO — LOTE 1A: 3 TABELAS BASE (companies, cbo_ocupacoes, user_roles)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ENUM necessário (user_roles)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin', 'manager', 'user', 'admin_master', 'admin_empresa',
      'analista_rh', 'gestor_departamento', 'colaborador', 'super_admin'
    );
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 1. companies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(255) NOT NULL,
  cnpj character varying(18) NOT NULL,
  contact_person character varying(255),
  email character varying(255),
  status character varying(20) DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  logo_url text,
  logo_upload_date timestamp with time zone,
  primary_color text DEFAULT '#1E5A99'::text,
  secondary_color text DEFAULT '#333333'::text,
  accent_color text DEFAULT '#FFFFFF'::text,
  brand_name text,
  brand_logo_url text,
  brand_primary_color text DEFAULT '#C8102E'::text,
  brand_favicon_url text,
  is_internal boolean DEFAULT false,
  telefone text,
  segmento text,
  terms_accepted_at timestamp with time zone,
  terms_accepted_ip text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies USING btree (status);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies USING btree (cnpj);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

-- ---------------------------------------------------------------------
-- 2. cbo_ocupacoes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cbo_ocupacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT cbo_ocupacoes_pkey PRIMARY KEY (id),
  CONSTRAINT cbo_ocupacoes_codigo_key UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_cbo_titulo ON public.cbo_ocupacoes USING btree (titulo);

GRANT SELECT ON public.cbo_ocupacoes TO authenticated;
GRANT ALL ON public.cbo_ocupacoes TO service_role;

-- ---------------------------------------------------------------------
-- 3. user_roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- =====================================================================
-- FIM DO LOTE 1A
-- =====================================================================
