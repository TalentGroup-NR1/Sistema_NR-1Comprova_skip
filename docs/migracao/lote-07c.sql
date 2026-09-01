-- ============================================================
-- LOTE 7C — Dados pessoais e auditoria de acesso do colaborador
-- Depende de: colaboradores (07b), companies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dependentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  birth_date date NOT NULL,
  relationship public.relationship_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependentes TO authenticated;
GRANT ALL ON public.dependentes TO service_role;

CREATE TABLE IF NOT EXISTS public.collaborator_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  consent_type text NOT NULL,
  consent_given boolean NOT NULL DEFAULT true,
  consent_date timestamptz NOT NULL DEFAULT now(),
  revoked_date timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaborator_consents_collaborator_id_consent_type_key UNIQUE (collaborator_id, consent_type),
  CONSTRAINT collaborator_consents_consent_type_check CHECK (consent_type = ANY (ARRAY['rh_data','feedback','training','communications']))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_consents TO authenticated;
GRANT ALL ON public.collaborator_consents TO service_role;

CREATE TABLE IF NOT EXISTS public.acesso_colaborador_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email_destino text NOT NULL,
  disparado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  email_enviado boolean NOT NULL DEFAULT false,
  erro_envio text,
  reenvio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acesso_colaborador_audit_colaborador ON public.acesso_colaborador_audit (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_acesso_colaborador_audit_company ON public.acesso_colaborador_audit (company_id);
CREATE INDEX IF NOT EXISTS idx_acesso_colaborador_audit_created ON public.acesso_colaborador_audit (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acesso_colaborador_audit TO authenticated;
GRANT ALL ON public.acesso_colaborador_audit TO service_role;

CREATE TABLE IF NOT EXISTS public.ficha_profissional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL UNIQUE REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  formacao_academica text,
  cursos_realizados text,
  breve_resumo text,
  career_grid_stars jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_profissional TO authenticated;
GRANT ALL ON public.ficha_profissional TO service_role;
