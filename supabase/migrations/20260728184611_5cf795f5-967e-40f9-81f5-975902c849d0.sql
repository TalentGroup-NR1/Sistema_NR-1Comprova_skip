CREATE TABLE public.empresas_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  codigo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);

CREATE INDEX idx_empresas_clientes_company ON public.empresas_clientes(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_clientes TO authenticated;
GRANT ALL ON public.empresas_clientes TO service_role;

ALTER TABLE public.empresas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas_clientes_select" ON public.empresas_clientes
  FOR SELECT TO authenticated
  USING (public.is_admin_master(auth.uid()) OR company_id = public.get_my_company_id());

CREATE POLICY "empresas_clientes_insert" ON public.empresas_clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin_empresa','analista_rh'))
  );

CREATE POLICY "empresas_clientes_update" ON public.empresas_clientes
  FOR UPDATE TO authenticated
  USING (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin_empresa','analista_rh'))
  )
  WITH CHECK (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('admin_empresa','analista_rh'))
  );

CREATE POLICY "empresas_clientes_delete" ON public.empresas_clientes
  FOR DELETE TO authenticated
  USING (
    (public.is_admin_master(auth.uid()))
    OR (company_id = public.get_my_company_id()
        AND public.get_my_role() = 'admin_empresa')
  );

CREATE TRIGGER update_empresas_clientes_updated_at
  BEFORE UPDATE ON public.empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.empresas_clientes (company_id, nome)
SELECT DISTINCT c.company_id, btrim(c.empresa_cliente)
FROM public.colaboradores c
WHERE c.company_id IS NOT NULL
  AND c.empresa_cliente IS NOT NULL
  AND btrim(c.empresa_cliente) <> ''
ON CONFLICT (company_id, nome) DO NOTHING;