
CREATE OR REPLACE FUNCTION public.get_my_colaborador_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Colaboradores can view their own record" ON public.colaboradores;
CREATE POLICY "Colaboradores can view their own record"
ON public.colaboradores FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin_master(auth.uid())
  OR (
    get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
    AND company_id = get_user_company_id(auth.uid())
  )
  OR (
    get_user_role(auth.uid()) = 'gestor_departamento'::app_role
    AND company_id = get_user_company_id(auth.uid())
    AND gestor_id = public.get_my_colaborador_id()
  )
);
