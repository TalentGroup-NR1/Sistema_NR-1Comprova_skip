
-- Tabela para armazenar campos editáveis da Ficha de Apresentação Profissional
CREATE TABLE public.ficha_profissional (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  formacao_academica TEXT,
  cursos_realizados TEXT,
  breve_resumo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id)
);

-- Enable RLS
ALTER TABLE public.ficha_profissional ENABLE ROW LEVEL SECURITY;

-- Admin master can do everything
CREATE POLICY "Admin master full access ficha_profissional"
ON public.ficha_profissional
FOR ALL
USING (is_admin_master(auth.uid()));

-- Admin empresa and analista_rh can manage fichas for their company
CREATE POLICY "Admin empresa manages ficha_profissional"
ON public.ficha_profissional
FOR ALL
USING (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND company_id = get_my_company_id()
);

-- Gestor can view fichas of their team
CREATE POLICY "Gestor views ficha_profissional"
ON public.ficha_profissional
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND company_id = get_my_company_id()
);

-- Trigger for updated_at
CREATE TRIGGER update_ficha_profissional_updated_at
BEFORE UPDATE ON public.ficha_profissional
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
