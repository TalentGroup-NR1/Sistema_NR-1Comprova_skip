-- Create enums for vacation status
CREATE TYPE public.periodo_aquisitivo_status AS ENUM ('aberto', 'fechado', 'vencido');
CREATE TYPE public.ferias_gozo_status AS ENUM ('planejado', 'aprovado', 'gozado', 'cancelado');

-- Table for acquisition periods
CREATE TABLE public.ferias_periodos_aquisitivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_inicio_aquisitivo DATE NOT NULL,
  data_fim_aquisitivo DATE NOT NULL,
  data_limite_gozo DATE NOT NULL,
  dias_adquiridos INTEGER NOT NULL DEFAULT 30,
  status periodo_aquisitivo_status NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for vacation periods (gozo)
CREATE TABLE public.ferias_gozo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_aquisitivo_id UUID NOT NULL REFERENCES public.ferias_periodos_aquisitivos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_inicio_gozo DATE NOT NULL,
  data_fim_gozo DATE NOT NULL,
  dias_gozados INTEGER NOT NULL,
  data_pagamento DATE NOT NULL,
  status ferias_gozo_status NOT NULL DEFAULT 'planejado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ferias_periodos_aquisitivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias_gozo ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ferias_periodos_aquisitivos
CREATE POLICY "Admin master full access ferias_periodos_aquisitivos"
ON public.ferias_periodos_aquisitivos
FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company ferias_periodos_aquisitivos"
ON public.ferias_periodos_aquisitivos
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

CREATE POLICY "Analista RH can manage own company ferias_periodos_aquisitivos"
ON public.ferias_periodos_aquisitivos
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

CREATE POLICY "Gestor departamento can view own company ferias_periodos_aquisitivos"
ON public.ferias_periodos_aquisitivos
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
);

-- RLS Policies for ferias_gozo
CREATE POLICY "Admin master full access ferias_gozo"
ON public.ferias_gozo
FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company ferias_gozo"
ON public.ferias_gozo
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

CREATE POLICY "Analista RH can manage own company ferias_gozo"
ON public.ferias_gozo
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

CREATE POLICY "Gestor departamento can view own company ferias_gozo"
ON public.ferias_gozo
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
);

-- Trigger for updated_at
CREATE TRIGGER update_ferias_periodos_aquisitivos_updated_at
  BEFORE UPDATE ON public.ferias_periodos_aquisitivos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ferias_gozo_updated_at
  BEFORE UPDATE ON public.ferias_gozo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();