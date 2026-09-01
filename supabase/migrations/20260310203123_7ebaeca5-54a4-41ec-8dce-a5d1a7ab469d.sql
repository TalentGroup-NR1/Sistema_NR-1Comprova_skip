
-- Allow gestor_departamento to view questionnaire templates from their company
CREATE POLICY "Gestor departamento can view questionnaire_templates"
ON public.questionnaire_templates
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND (company_id IS NULL OR company_id = get_user_company_id(auth.uid()))
);

-- Allow gestor_departamento to view evolution reports for their company
CREATE POLICY "Gestor departamento can view evolution_reports"
ON public.evolution_reports
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND company_id = get_user_company_id(auth.uid())
);
