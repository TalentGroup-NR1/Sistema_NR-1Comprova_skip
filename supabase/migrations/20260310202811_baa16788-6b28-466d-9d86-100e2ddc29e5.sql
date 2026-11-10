
-- Allow gestor_departamento to view feedback_responses for their company's cycles
CREATE POLICY "Gestor departamento can view feedback_responses"
ON public.feedback_responses
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM feedback_cycles fc
    WHERE fc.id = feedback_responses.feedback_cycle_id
      AND fc.company_id = get_user_company_id(auth.uid())
  )
);

-- Allow gestor_departamento to view questions from their company's templates
CREATE POLICY "Gestor departamento can view questions"
ON public.questions
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM questionnaire_templates qt
    WHERE qt.id = questions.questionnaire_template_id
      AND (qt.company_id IS NULL OR qt.company_id = get_user_company_id(auth.uid()))
  )
);
