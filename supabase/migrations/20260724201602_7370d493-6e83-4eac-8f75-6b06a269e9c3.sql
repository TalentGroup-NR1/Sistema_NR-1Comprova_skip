
CREATE TABLE public.beneficios_empresa_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id UUID NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
  empresa_cliente TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(beneficio_id, empresa_cliente)
);

CREATE INDEX idx_bec_beneficio ON public.beneficios_empresa_cliente(beneficio_id);
CREATE INDEX idx_bec_company_empresa ON public.beneficios_empresa_cliente(company_id, empresa_cliente);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_empresa_cliente TO authenticated;
GRANT ALL ON public.beneficios_empresa_cliente TO service_role;

ALTER TABLE public.beneficios_empresa_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_master_full_access_beneficios_empresa_cliente
  ON public.beneficios_empresa_cliente
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin_master'::app_role)
  WITH CHECK (get_my_role() = 'admin_master'::app_role);

CREATE POLICY company_admin_access_beneficios_empresa_cliente
  ON public.beneficios_empresa_cliente
  FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND company_id = get_my_company_id())
  WITH CHECK ((get_my_role() = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])) AND company_id = get_my_company_id());

CREATE POLICY colaborador_read_beneficios_empresa_cliente
  ON public.beneficios_empresa_cliente
  FOR SELECT TO authenticated
  USING (company_id = get_my_company_id());
