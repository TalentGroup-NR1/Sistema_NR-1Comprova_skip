-- Drop and recreate the function to return questions along with cycle data
DROP FUNCTION IF EXISTS public.get_feedback_cycle_by_token(uuid);

CREATE OR REPLACE FUNCTION public.get_feedback_cycle_by_token(p_token uuid)
RETURNS TABLE(
  cycle_id uuid, 
  colaborador_name character varying, 
  milestone_type milestone_type, 
  respondent_type respondent_type, 
  template_id uuid, 
  already_submitted boolean,
  questions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cycle_id UUID;
  v_respondent respondent_type;
  v_template_id UUID;
BEGIN
  -- Check if it's a collaborator token
  SELECT fc.id, fc.questionnaire_template_id INTO v_cycle_id, v_template_id
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;
  
  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    -- Check if it's a manager token
    SELECT fc.id, fc.questionnaire_template_id INTO v_cycle_id, v_template_id
    FROM feedback_cycles fc
    WHERE fc.gestor_token = p_token;
    
    IF v_cycle_id IS NOT NULL THEN
      v_respondent := 'GESTOR';
    END IF;
  END IF;
  
  IF v_cycle_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    fc.id AS cycle_id,
    c.full_name AS colaborador_name,
    fc.milestone_type,
    v_respondent AS respondent_type,
    fc.questionnaire_template_id AS template_id,
    EXISTS (
      SELECT 1 FROM feedback_responses fr 
      WHERE fr.feedback_cycle_id = fc.id 
      AND fr.respondent_type = v_respondent
    ) AS already_submitted,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'question_text', q.question_text,
          'question_type', q.question_type,
          'scale_min', q.scale_min,
          'scale_max', q.scale_max,
          'respondent_type', q.respondent_type,
          'order_index', q.order_index
        ) ORDER BY q.order_index
      )
      FROM questions q
      WHERE q.questionnaire_template_id = v_template_id
      AND (q.respondent_type = v_respondent OR q.respondent_type = 'AMBOS')
    ) AS questions
  FROM feedback_cycles fc
  JOIN colaboradores c ON c.id = fc.colaborador_id
  WHERE fc.id = v_cycle_id;
END;
$function$;