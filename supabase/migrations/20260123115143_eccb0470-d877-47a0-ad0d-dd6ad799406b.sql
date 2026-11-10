-- =============================================
-- Fase 1: Expandir tabela beneficios com novos campos
-- =============================================

-- Adicionar novos campos à tabela beneficios
ALTER TABLE public.beneficios
ADD COLUMN IF NOT EXISTS empresa VARCHAR(200),
ADD COLUMN IF NOT EXISTS instrucoes TEXT,
ADD COLUMN IF NOT EXISTS importancia TEXT,
ADD COLUMN IF NOT EXISTS link_externo VARCHAR(500),
ADD COLUMN IF NOT EXISTS imagem_capa VARCHAR(500),
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'outros';

-- =============================================
-- Fase 2: Criar tabela beneficios_materiais
-- =============================================

CREATE TABLE IF NOT EXISTS public.beneficios_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id UUID NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pdf', 'ppt', 'video')),
  titulo VARCHAR(200) NOT NULL,
  arquivo_url VARCHAR(500) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_beneficios_materiais_beneficio_id 
ON public.beneficios_materiais(beneficio_id);

-- Enable RLS
ALTER TABLE public.beneficios_materiais ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Fase 3: Políticas RLS para beneficios_materiais
-- =============================================

-- Admin Master: acesso total
CREATE POLICY "admin_master_full_access_materiais"
ON public.beneficios_materiais
FOR ALL
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

-- Admin Empresa e Analista RH: acesso à própria empresa
CREATE POLICY "admin_empresa_rh_access_materiais"
ON public.beneficios_materiais
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.beneficios b
    WHERE b.id = beneficio_id
    AND b.company_id = public.get_my_company_id()
  )
  AND public.get_my_role() IN ('admin_empresa', 'analista_rh')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.beneficios b
    WHERE b.id = beneficio_id
    AND b.company_id = public.get_my_company_id()
  )
  AND public.get_my_role() IN ('admin_empresa', 'analista_rh')
);

-- Colaborador: apenas leitura dos benefícios que tem acesso
CREATE POLICY "colaborador_read_materiais"
ON public.beneficios_materiais
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    JOIN public.colaborador_beneficios cb ON cb.colaborador_id = c.id
    WHERE c.user_id = auth.uid()
    AND cb.beneficio_id = beneficios_materiais.beneficio_id
    AND cb.status = 'ativo'
  )
  OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    JOIN public.beneficios_departamento bd ON bd.departamento = c.department AND bd.company_id = c.company_id
    WHERE c.user_id = auth.uid()
    AND bd.beneficio_id = beneficios_materiais.beneficio_id
  )
);

-- =============================================
-- Fase 4: Criar Storage Buckets
-- =============================================

-- Bucket para imagens de capa (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'beneficios-imagens',
  'beneficios-imagens',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para materiais educativos (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'beneficios-materiais',
  'beneficios-materiais',
  false,
  524288000, -- 500MB para vídeos
  ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Fase 5: Políticas de Storage
-- =============================================

-- Políticas para beneficios-imagens (público para leitura)
CREATE POLICY "public_read_beneficios_imagens"
ON storage.objects FOR SELECT
USING (bucket_id = 'beneficios-imagens');

CREATE POLICY "admin_upload_beneficios_imagens"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficios-imagens'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "admin_update_beneficios_imagens"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'beneficios-imagens'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "admin_delete_beneficios_imagens"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficios-imagens'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

-- Políticas para beneficios-materiais (privado)
CREATE POLICY "colaborador_read_beneficios_materiais"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'beneficios-materiais'
  AND (
    public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
    OR public.get_my_role() = 'colaborador'
  )
);

CREATE POLICY "admin_upload_beneficios_materiais"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'beneficios-materiais'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "admin_update_beneficios_materiais"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'beneficios-materiais'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "admin_delete_beneficios_materiais"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'beneficios-materiais'
  AND public.get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);