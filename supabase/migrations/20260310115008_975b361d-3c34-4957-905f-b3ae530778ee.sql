
-- New table for benefit assignment by contract type
CREATE TABLE public.beneficios_tipo_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id UUID REFERENCES public.beneficios(id) ON DELETE CASCADE NOT NULL,
  tipo_contrato VARCHAR NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add valor column to colaborador_beneficios
ALTER TABLE public.colaborador_beneficios ADD COLUMN valor NUMERIC NULL;

-- Enable RLS
ALTER TABLE public.beneficios_tipo_contrato ENABLE ROW LEVEL SECURITY;

-- RLS policies mirroring beneficios_departamento
CREATE POLICY "admin_master_full_access_beneficios_tipo_contrato"
ON public.beneficios_tipo_contrato
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin_master')
WITH CHECK (public.get_my_role() = 'admin_master');

CREATE POLICY "company_admin_access_beneficios_tipo_contrato"
ON public.beneficios_tipo_contrato
FOR ALL
TO authenticated
USING (
  public.get_my_role() IN ('admin_empresa', 'analista_rh')
  AND company_id = public.get_my_company_id()
)
WITH CHECK (
  public.get_my_role() IN ('admin_empresa', 'analista_rh')
  AND company_id = public.get_my_company_id()
);

CREATE POLICY "colaborador_read_beneficios_tipo_contrato"
ON public.beneficios_tipo_contrato
FOR SELECT
TO authenticated
USING (
  company_id = public.get_my_company_id()
);
