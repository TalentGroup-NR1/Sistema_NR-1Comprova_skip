
-- Create analises_perfil table
CREATE TABLE public.analises_perfil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  candidato_nome TEXT NOT NULL,
  vaga TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  resultado JSONB,
  doc_alinhamento_path TEXT,
  doc_anuncio_path TEXT,
  doc_entrevista_path TEXT,
  doc_curriculo_path TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analises_perfil ENABLE ROW LEVEL SECURITY;

-- RLS policies - restrict to admin roles
CREATE POLICY "Admin roles can select analises_perfil"
ON public.analises_perfil FOR SELECT TO authenticated
USING (
  get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  AND (get_my_role() = 'admin_master' OR company_id = get_my_company_id())
);

CREATE POLICY "Admin roles can insert analises_perfil"
ON public.analises_perfil FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  AND (get_my_role() = 'admin_master' OR company_id = get_my_company_id())
  AND created_by = auth.uid()
);

CREATE POLICY "Admin roles can update analises_perfil"
ON public.analises_perfil FOR UPDATE TO authenticated
USING (
  get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  AND (get_my_role() = 'admin_master' OR company_id = get_my_company_id())
);

CREATE POLICY "Admin roles can delete analises_perfil"
ON public.analises_perfil FOR DELETE TO authenticated
USING (
  get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  AND (get_my_role() = 'admin_master' OR company_id = get_my_company_id())
);

-- Create storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos_analise', 'documentos_analise', false);

-- Storage policies
CREATE POLICY "Admin roles can upload documentos_analise"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos_analise'
  AND get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "Admin roles can read documentos_analise"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos_analise'
  AND get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

CREATE POLICY "Admin roles can delete documentos_analise"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos_analise'
  AND get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

-- Updated_at trigger
CREATE TRIGGER update_analises_perfil_updated_at
BEFORE UPDATE ON public.analises_perfil
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
