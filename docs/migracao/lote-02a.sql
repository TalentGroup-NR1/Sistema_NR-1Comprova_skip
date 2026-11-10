-- =====================================================================
-- LOTE 2A — ENUMS + profiles, onboarding_progress, terms_acceptance, replication_logs
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comunicado_status') THEN
    CREATE TYPE public.comunicado_status AS ENUM ('rascunho', 'publicado', 'agendado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publico_alvo_tipo') THEN
    CREATE TYPE public.publico_alvo_tipo AS ENUM ('todos', 'departamento', 'cargo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidade_tipo') THEN
    CREATE TYPE public.unidade_tipo AS ENUM ('matriz', 'filial', 'centro_distribuicao', 'escritorio');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  company_id uuid,
  full_name character varying(255),
  email character varying(255),
  phone character varying(20),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  must_change_password boolean DEFAULT false NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  current_step integer DEFAULT 0 NOT NULL,
  completed_steps text[] DEFAULT '{}'::text[] NOT NULL,
  dismissed boolean DEFAULT false NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT onboarding_progress_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_progress_company_id_key UNIQUE (company_id),
  CONSTRAINT onboarding_progress_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  acceptor_name text NOT NULL,
  acceptor_email text NOT NULL,
  terms_version text DEFAULT '1.0'::text NOT NULL,
  privacy_version text DEFAULT '1.0'::text NOT NULL,
  ip_address text,
  user_agent text,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT terms_acceptance_pkey PRIMARY KEY (id),
  CONSTRAINT terms_acceptance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_company ON public.terms_acceptance USING btree (company_id);

CREATE TABLE IF NOT EXISTS public.replication_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_user_id uuid,
  record_type text NOT NULL,
  source_record_id uuid NOT NULL,
  source_company_id uuid,
  target_company_id uuid,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT replication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT replication_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id),
  CONSTRAINT replication_logs_source_company_id_fkey FOREIGN KEY (source_company_id) REFERENCES public.companies(id),
  CONSTRAINT replication_logs_target_company_id_fkey FOREIGN KEY (target_company_id) REFERENCES public.companies(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms_acceptance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replication_logs TO authenticated;
GRANT ALL ON public.profiles, public.onboarding_progress, public.terms_acceptance, public.replication_logs TO service_role;
