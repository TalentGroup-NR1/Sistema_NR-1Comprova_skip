-- ============================================
-- SISTEMA DE CERTIFICADOS DE TREINAMENTO
-- ============================================

-- 1. Tabela principal de certificados
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  progresso_id UUID NOT NULL REFERENCES public.treinamento_progresso(id) ON DELETE CASCADE,
  
  -- Código único para validação pública
  certificate_code VARCHAR(50) NOT NULL UNIQUE,
  
  -- Dados do certificado (snapshot no momento da emissão)
  colaborador_nome VARCHAR(255) NOT NULL,
  treinamento_titulo VARCHAR(255) NOT NULL,
  carga_horaria INTEGER NOT NULL DEFAULT 0,
  data_conclusao TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Dados de emissão
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  issued_by UUID REFERENCES auth.users(id),
  issued_by_type VARCHAR(20) NOT NULL DEFAULT 'colaborador' CHECK (issued_by_type IN ('colaborador', 'admin')),
  
  -- Arquivo PDF
  file_path TEXT,
  
  -- Status e auditoria
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'revogado')),
  revogado_em TIMESTAMP WITH TIME ZONE,
  revogado_por UUID REFERENCES auth.users(id),
  revogado_motivo TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de logs de auditoria
CREATE TABLE public.certificates_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'emitido', 'reemitido', 'revogado', 'visualizado'
  performed_by UUID REFERENCES auth.users(id),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX idx_certificates_company_id ON public.certificates(company_id);
CREATE INDEX idx_certificates_colaborador_id ON public.certificates(colaborador_id);
CREATE INDEX idx_certificates_treinamento_id ON public.certificates(treinamento_id);
CREATE INDEX idx_certificates_certificate_code ON public.certificates(certificate_code);
CREATE INDEX idx_certificates_status ON public.certificates(status);
CREATE INDEX idx_certificates_audit_certificate_id ON public.certificates_audit_logs(certificate_id);

-- 4. Trigger para updated_at
CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para certificates
-- Admin master pode tudo
CREATE POLICY "Admin master full access certificates"
ON public.certificates FOR ALL
USING (public.is_admin_master(auth.uid()));

-- Usuários da mesma empresa podem visualizar
CREATE POLICY "Company users can view certificates"
ON public.certificates FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_admin_master(auth.uid())
    OR public.get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh', 'gestor_departamento')
    OR colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
  )
);

-- Colaborador pode inserir seu próprio certificado
CREATE POLICY "Colaborador can insert own certificate"
ON public.certificates FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
);

-- Admin/RH pode inserir certificados para qualquer colaborador da empresa
CREATE POLICY "Admin can insert certificates"
ON public.certificates FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh')
);

-- Admin/RH pode atualizar certificados (revogar)
CREATE POLICY "Admin can update certificates"
ON public.certificates FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh')
);

-- 7. Políticas RLS para audit logs
CREATE POLICY "Admin master full access audit logs"
ON public.certificates_audit_logs FOR ALL
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Company admin can view audit logs"
ON public.certificates_audit_logs FOR SELECT
USING (
  certificate_id IN (
    SELECT id FROM public.certificates 
    WHERE company_id = public.get_user_company_id(auth.uid())
  )
  AND public.get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh')
);

CREATE POLICY "Anyone authenticated can insert audit logs"
ON public.certificates_audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Storage bucket para certificados
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- 9. Políticas de storage para certificados
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificates'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates'
  AND auth.uid() IS NOT NULL
);

-- 10. Função pública para validação de certificado (sem auth)
CREATE OR REPLACE FUNCTION public.validate_certificate(p_code TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  colaborador_nome VARCHAR,
  treinamento_titulo VARCHAR,
  carga_horaria INTEGER,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  issue_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.status = 'ativo' AS is_valid,
    c.colaborador_nome,
    c.treinamento_titulo,
    c.carga_horaria,
    c.data_conclusao,
    c.issue_date,
    c.status
  FROM public.certificates c
  WHERE c.certificate_code = p_code;
END;
$$;