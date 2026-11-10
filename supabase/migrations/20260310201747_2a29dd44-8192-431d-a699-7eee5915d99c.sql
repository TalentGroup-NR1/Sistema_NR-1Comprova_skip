CREATE POLICY "Gestor departamento can view published comunicados"
ON public.comunicados
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND status = 'publicado'
  AND data_publicacao <= now()
  AND company_id = get_user_company_id(auth.uid())
);