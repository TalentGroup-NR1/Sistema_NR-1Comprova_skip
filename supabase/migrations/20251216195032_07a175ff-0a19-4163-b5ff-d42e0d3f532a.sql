-- Create new enum for target audience
CREATE TYPE target_audience_type AS ENUM ('COLABORADOR', 'GESTOR', 'AMBOS', 'NAO_ESPECIFICADO');

-- Add target_audience column to questionnaire_templates
ALTER TABLE questionnaire_templates 
ADD COLUMN target_audience target_audience_type NOT NULL DEFAULT 'NAO_ESPECIFICADO';

-- Add new columns to feedback_cycles for separate templates
ALTER TABLE feedback_cycles 
ADD COLUMN collaborator_questionnaire_template_id uuid REFERENCES questionnaire_templates(id),
ADD COLUMN gestor_questionnaire_template_id uuid REFERENCES questionnaire_templates(id);

-- Migrate existing data: copy questionnaire_template_id to both new columns
UPDATE feedback_cycles 
SET collaborator_questionnaire_template_id = questionnaire_template_id,
    gestor_questionnaire_template_id = questionnaire_template_id
WHERE questionnaire_template_id IS NOT NULL;

-- Make questionnaire_template_id nullable (keeping for backward compatibility)
ALTER TABLE feedback_cycles ALTER COLUMN questionnaire_template_id DROP NOT NULL;

-- Update the trigger function to not assign templates (they'll be assigned when cycle is activated)
CREATE OR REPLACE FUNCTION public.create_feedback_cycles_for_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar ciclo 30 dias (sem template pré-atribuído)
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '30_DIAS', 
    NEW.admission_date + INTERVAL '30 days',
    'NAO_INICIADO',
    auth.uid()
  );

  -- Criar ciclo 80 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '80_DIAS', 
    NEW.admission_date + INTERVAL '80 days',
    'NAO_INICIADO',
    auth.uid()
  );

  -- Criar ciclo 120 dias
  INSERT INTO feedback_cycles (company_id, colaborador_id, milestone_type, due_date, 
    status, created_by_user_id)
  VALUES (
    NEW.company_id, 
    NEW.id, 
    '120_DIAS', 
    NEW.admission_date + INTERVAL '120 days',
    'NAO_INICIADO',
    auth.uid()
  );

  RETURN NEW;
END;
$function$;

-- Update get_feedback_cycle_by_token to use correct template based on respondent type
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
  SELECT fc.id, 
    COALESCE(fc.collaborator_questionnaire_template_id, fc.questionnaire_template_id)
  INTO v_cycle_id, v_template_id
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;
  
  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    -- Check if it's a manager token
    SELECT fc.id, 
      COALESCE(fc.gestor_questionnaire_template_id, fc.questionnaire_template_id)
    INTO v_cycle_id, v_template_id
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
    v_template_id AS template_id,
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