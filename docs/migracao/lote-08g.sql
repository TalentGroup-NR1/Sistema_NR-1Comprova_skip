-- ============================================================
-- LOTE 8G — Certificados e auditoria de certificados
-- Depende de: companies, colaboradores (07B), treinamentos (Lote 6),
--             treinamento_progresso (08F)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  treinamento_id uuid NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  progresso_id uuid NOT NULL REFERENCES public.treinamento_progresso(id) ON DELETE CASCADE,
  certificate_code varchar(50) NOT NULL UNIQUE,
  colaborador_nome varchar(255) NOT NULL,
  treinamento_titulo varchar(255) NOT NULL,
  carga_horaria integer NOT NULL DEFAULT 0,
  data_conclusao timestamptz NOT NULL,
  issue_date timestamptz NOT NULL DEFAULT now(),
  issued_by uuid REFERENCES auth.users(id),
  issued_by_type varchar(20) NOT NULL DEFAULT 'colaborador',
  file_path text,
  status varchar(20) NOT NULL DEFAULT 'ativo',
  revogado_em timestamptz,
  revogado_por uuid REFERENCES auth.users(id),
  revogado_motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_issued_by_type_check CHECK (issued_by_type::text = ANY (ARRAY['colaborador','admin'])),
  CONSTRAINT certificates_status_check CHECK (status::text = ANY (ARRAY['ativo','revogado']))
);

CREATE INDEX IF NOT EXISTS idx_certificates_company_id ON public.certificates (company_id);
CREATE INDEX IF NOT EXISTS idx_certificates_colaborador_id ON public.certificates (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_certificates_treinamento_id ON public.certificates (treinamento_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_code ON public.certificates (certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

CREATE TABLE IF NOT EXISTS public.certificates_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  action varchar(50) NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  details jsonb,
  ip_address varchar(45),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_audit_certificate_id ON public.certificates_audit_logs (certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificates_audit_created_at ON public.certificates_audit_logs (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates_audit_logs TO authenticated;
GRANT ALL ON public.certificates_audit_logs TO service_role;
