
-- Create table for feedbacks_colaboradores
CREATE TABLE public.feedbacks_colaboradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  registrado_por_user_id UUID NOT NULL,
  registrado_por_nome VARCHAR(255) NOT NULL,
  data_feedback DATE NOT NULL DEFAULT CURRENT_DATE,
  assunto TEXT NOT NULL,
  detalhes_conversa TEXT NOT NULL,
  prazo_retorno DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedbacks_colaboradores ENABLE ROW LEVEL SECURITY;

-- Admin master full access
CREATE POLICY "Admin master full access feedbacks_colaboradores"
ON public.feedbacks_colaboradores
FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

-- Admin empresa can manage own company feedbacks
CREATE POLICY "Admin empresa can manage own company feedbacks_colaboradores"
ON public.feedbacks_colaboradores
FOR ALL
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

-- Analista RH can manage own company feedbacks
CREATE POLICY "Analista RH can manage own company feedbacks_colaboradores"
ON public.feedbacks_colaboradores
FOR ALL
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

-- Gestor departamento can manage feedbacks for colaboradores they manage
CREATE POLICY "Gestor departamento can manage feedbacks_colaboradores"
ON public.feedbacks_colaboradores
FOR ALL
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role) 
  AND company_id = get_user_company_id(auth.uid()) 
  AND company_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_departamento'::app_role) 
  AND company_id = get_user_company_id(auth.uid()) 
  AND company_id IS NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_feedbacks_colaboradores_colaborador_id ON public.feedbacks_colaboradores(colaborador_id);
CREATE INDEX idx_feedbacks_colaboradores_company_id ON public.feedbacks_colaboradores(company_id);
CREATE INDEX idx_feedbacks_colaboradores_data_feedback ON public.feedbacks_colaboradores(data_feedback DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_feedbacks_colaboradores_updated_at
  BEFORE UPDATE ON public.feedbacks_colaboradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
