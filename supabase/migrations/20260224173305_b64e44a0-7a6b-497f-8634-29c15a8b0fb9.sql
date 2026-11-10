-- Allow colaborador to SELECT their own feedback_responses (via feedback_cycles they belong to)
CREATE POLICY "Colaborador can view own feedback_responses"
ON public.feedback_responses
FOR SELECT
USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM feedback_cycles fc
    JOIN colaboradores c ON c.id = fc.colaborador_id
    WHERE fc.id = feedback_responses.feedback_cycle_id
      AND c.user_id = auth.uid()
  )
);

-- Allow colaborador to SELECT questions linked to their feedback cycles' templates
CREATE POLICY "Colaborador can view questions from own cycles"
ON public.questions
FOR SELECT
USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND EXISTS (
    SELECT 1
    FROM feedback_cycles fc
    JOIN colaboradores c ON c.id = fc.colaborador_id
    WHERE c.user_id = auth.uid()
      AND (
        fc.collaborator_questionnaire_template_id = questions.questionnaire_template_id
        OR fc.gestor_questionnaire_template_id = questions.questionnaire_template_id
      )
  )
);