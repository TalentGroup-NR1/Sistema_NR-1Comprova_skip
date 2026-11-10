-- Create enum for comunicado status
CREATE TYPE public.comunicado_status AS ENUM ('rascunho', 'publicado', 'agendado');

-- Create enum for target audience type
CREATE TYPE public.publico_alvo_tipo AS ENUM ('todos', 'departamento', 'cargo');

-- Create comunicados table
CREATE TABLE public.comunicados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  autor_id UUID NOT NULL,
  autor_nome VARCHAR(255) NOT NULL,
  data_publicacao TIMESTAMPTZ,
  status comunicado_status NOT NULL DEFAULT 'rascunho',
  publico_alvo_tipo publico_alvo_tipo NOT NULL DEFAULT 'todos',
  publico_alvo_valor TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create comunicados_anexos table
CREATE TABLE public.comunicados_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create comunicados_visualizacoes table for tracking views
CREATE TABLE public.comunicados_visualizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL,
  visualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comunicado_id, colaborador_id)
);

-- Enable RLS on all tables
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_visualizacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comunicados
CREATE POLICY "Admin master full access comunicados"
ON public.comunicados FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company comunicados"
ON public.comunicados FOR ALL
USING (
  has_role(auth.uid(), 'admin_empresa'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'admin_empresa'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
);

CREATE POLICY "Analista RH can manage own company comunicados"
ON public.comunicados FOR ALL
USING (
  has_role(auth.uid(), 'analista_rh'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'analista_rh'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
);

CREATE POLICY "Colaboradores can view published comunicados"
ON public.comunicados FOR SELECT
USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND status = 'publicado'
  AND data_publicacao <= now()
  AND company_id = get_user_company_id(auth.uid())
);

-- RLS Policies for comunicados_anexos
CREATE POLICY "Admin master full access comunicados_anexos"
ON public.comunicados_anexos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND is_admin_master(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND is_admin_master(auth.uid())
  )
);

CREATE POLICY "Admin empresa can manage own company comunicados_anexos"
ON public.comunicados_anexos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND has_role(auth.uid(), 'admin_empresa'::app_role)
    AND c.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND has_role(auth.uid(), 'admin_empresa'::app_role)
    AND c.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Analista RH can manage own company comunicados_anexos"
ON public.comunicados_anexos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND has_role(auth.uid(), 'analista_rh'::app_role)
    AND c.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND has_role(auth.uid(), 'analista_rh'::app_role)
    AND c.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Colaboradores can view published comunicados_anexos"
ON public.comunicados_anexos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.comunicados c 
    WHERE c.id = comunicados_anexos.comunicado_id 
    AND c.status = 'publicado'
    AND c.data_publicacao <= now()
    AND c.company_id = get_user_company_id(auth.uid())
  )
);

-- RLS Policies for comunicados_visualizacoes
CREATE POLICY "Admin can view all visualizacoes"
ON public.comunicados_visualizacoes FOR SELECT
USING (
  is_admin_master(auth.uid()) OR
  has_role(auth.uid(), 'admin_empresa'::app_role) OR
  has_role(auth.uid(), 'analista_rh'::app_role)
);

CREATE POLICY "Colaboradores can insert own visualizacoes"
ON public.comunicados_visualizacoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM colaboradores c 
    WHERE c.id = comunicados_visualizacoes.colaborador_id
    AND c.corporate_email = (SELECT email FROM profiles WHERE user_id = auth.uid())
  )
);

-- Create storage bucket for comunicados attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comunicados-anexos', 'comunicados-anexos', true);

-- Storage policies
CREATE POLICY "Admin can upload comunicados anexos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comunicados-anexos' 
  AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'admin_empresa'::app_role) OR
    has_role(auth.uid(), 'analista_rh'::app_role)
  )
);

CREATE POLICY "Admin can update comunicados anexos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'comunicados-anexos' 
  AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'admin_empresa'::app_role) OR
    has_role(auth.uid(), 'analista_rh'::app_role)
  )
);

CREATE POLICY "Admin can delete comunicados anexos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comunicados-anexos' 
  AND (
    is_admin_master(auth.uid()) OR
    has_role(auth.uid(), 'admin_empresa'::app_role) OR
    has_role(auth.uid(), 'analista_rh'::app_role)
  )
);

CREATE POLICY "Anyone can view comunicados anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'comunicados-anexos');

-- Create trigger for updated_at
CREATE TRIGGER update_comunicados_updated_at
BEFORE UPDATE ON public.comunicados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();