-- Create beneficios table (types of benefits available)
CREATE TABLE public.beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'vale_alimentacao',
  valor_mensal DECIMAL(10,2),
  operadora_fornecedor VARCHAR(200),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create beneficios_departamento table (which departments have access)
CREATE TABLE public.beneficios_departamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id UUID NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  departamento VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(beneficio_id, departamento)
);

-- Create colaborador_beneficios table (individual assignments with card details)
CREATE TABLE public.colaborador_beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  beneficio_id UUID NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  numero_cartao VARCHAR(50),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, beneficio_id)
);

-- Enable RLS on all tables
ALTER TABLE public.beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios_departamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_beneficios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beneficios table
CREATE POLICY "Admin master full access beneficios"
ON public.beneficios FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company beneficios"
ON public.beneficios FOR ALL
USING (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Analista RH can manage own company beneficios"
ON public.beneficios FOR ALL
USING (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Gestor can view own company beneficios"
ON public.beneficios FOR SELECT
USING (has_role(auth.uid(), 'gestor_departamento') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Colaborador can view active beneficios from own company"
ON public.beneficios FOR SELECT
USING (has_role(auth.uid(), 'colaborador') AND company_id = get_user_company_id(auth.uid()) AND ativo = true);

-- RLS Policies for beneficios_departamento table
CREATE POLICY "Admin master full access beneficios_departamento"
ON public.beneficios_departamento FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage own company beneficios_departamento"
ON public.beneficios_departamento FOR ALL
USING (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin_empresa') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Analista RH can manage own company beneficios_departamento"
ON public.beneficios_departamento FOR ALL
USING (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'analista_rh') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Colaborador can view beneficios_departamento from own company"
ON public.beneficios_departamento FOR SELECT
USING (has_role(auth.uid(), 'colaborador') AND company_id = get_user_company_id(auth.uid()));

-- RLS Policies for colaborador_beneficios table
CREATE POLICY "Admin master full access colaborador_beneficios"
ON public.colaborador_beneficios FOR ALL
USING (is_admin_master(auth.uid()))
WITH CHECK (is_admin_master(auth.uid()));

CREATE POLICY "Admin empresa can manage colaborador_beneficios via colaborador"
ON public.colaborador_beneficios FOR ALL
USING (
  has_role(auth.uid(), 'admin_empresa') AND 
  EXISTS (
    SELECT 1 FROM public.colaboradores c 
    WHERE c.id = colaborador_beneficios.colaborador_id 
    AND c.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin_empresa') AND 
  EXISTS (
    SELECT 1 FROM public.colaboradores c 
    WHERE c.id = colaborador_beneficios.colaborador_id 
    AND c.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Analista RH can manage colaborador_beneficios via colaborador"
ON public.colaborador_beneficios FOR ALL
USING (
  has_role(auth.uid(), 'analista_rh') AND 
  EXISTS (
    SELECT 1 FROM public.colaboradores c 
    WHERE c.id = colaborador_beneficios.colaborador_id 
    AND c.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'analista_rh') AND 
  EXISTS (
    SELECT 1 FROM public.colaboradores c 
    WHERE c.id = colaborador_beneficios.colaborador_id 
    AND c.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Colaborador can view own beneficios"
ON public.colaborador_beneficios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c 
    WHERE c.id = colaborador_beneficios.colaborador_id 
    AND c.user_id = auth.uid()
  )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_beneficios_updated_at
BEFORE UPDATE ON public.beneficios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaborador_beneficios_updated_at
BEFORE UPDATE ON public.colaborador_beneficios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();