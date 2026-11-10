-- Create evolution_reports table for storing executive conclusions
CREATE TABLE public.evolution_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id),
  report_text TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evolution_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin master full access evolution_reports"
ON public.evolution_reports
FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company evolution_reports"
ON public.evolution_reports
FOR ALL
USING (
  has_role(auth.uid(), 'admin_empresa'::app_role) AND 
  company_id = get_user_company_id(auth.uid()) AND 
  company_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'admin_empresa'::app_role) AND 
  company_id = get_user_company_id(auth.uid()) AND 
  company_id IS NOT NULL
);

CREATE POLICY "Analista RH can manage own company evolution_reports"
ON public.evolution_reports
FOR ALL
USING (
  has_role(auth.uid(), 'analista_rh'::app_role) AND 
  company_id = get_user_company_id(auth.uid()) AND 
  company_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'analista_rh'::app_role) AND 
  company_id = get_user_company_id(auth.uid()) AND 
  company_id IS NOT NULL
);

-- Create trigger for updated_at
CREATE TRIGGER update_evolution_reports_updated_at
BEFORE UPDATE ON public.evolution_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_evolution_reports_colaborador ON public.evolution_reports(colaborador_id);
CREATE INDEX idx_evolution_reports_company ON public.evolution_reports(company_id);