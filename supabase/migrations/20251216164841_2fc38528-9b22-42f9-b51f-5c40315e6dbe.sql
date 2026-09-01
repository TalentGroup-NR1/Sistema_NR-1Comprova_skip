-- Create allocation_status enum
CREATE TYPE allocation_status AS ENUM ('ATIVA', 'FINALIZADA', 'PAUSADA', 'CANCELADA');

-- Create allocations table
CREATE TABLE public.allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  allocation_role VARCHAR(100) NOT NULL,
  project_name VARCHAR(255),
  allocation_status allocation_status NOT NULL DEFAULT 'ATIVA',
  description TEXT,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_allocations_company_id ON public.allocations(company_id);
CREATE INDEX idx_allocations_colaborador_id ON public.allocations(colaborador_id);
CREATE INDEX idx_allocations_status ON public.allocations(allocation_status);

-- Create trigger for updated_at
CREATE TRIGGER update_allocations_updated_at
  BEFORE UPDATE ON public.allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin master can only SELECT (view-only)
CREATE POLICY "Admin master can view all allocations"
  ON public.allocations
  FOR SELECT
  USING (is_admin_master(auth.uid()));

-- RLS Policy: Admin empresa full CRUD on own company
CREATE POLICY "Admin empresa can manage own company allocations"
  ON public.allocations
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

-- RLS Policy: Analista RH full CRUD on own company
CREATE POLICY "Analista RH can manage own company allocations"
  ON public.allocations
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