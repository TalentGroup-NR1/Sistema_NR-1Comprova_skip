-- Helper: resolve default active template for a company + milestone + respondent
CREATE OR REPLACE FUNCTION public.resolve_feedback_template(
  p_company_id uuid,
  p_milestone milestone_type,
  p_respondent respondent_type
) RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id
  FROM questionnaire_templates t
  WHERE t.is_active = true
    AND t.milestone_type = p_milestone
    AND (t.company_id = p_company_id OR t.company_id IS NULL)
    AND (
      t.target_audience::text = p_respondent::text
      OR t.target_audience = 'AMBOS'
      OR t.target_audience = 'NAO_ESPECIFICADO'
    )
    AND EXISTS (
      SELECT 1 FROM questions q
      WHERE q.questionnaire_template_id = t.id
        AND (q.respondent_type = p_respondent OR q.respondent_type = 'AMBOS')
    )
  ORDER BY
    (t.company_id = p_company_id) DESC,
    (t.target_audience::text = p_respondent::text) DESC,
    t.created_at DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_feedback_template(uuid, milestone_type, respondent_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_feedback_template(uuid, milestone_type, respondent_type) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_feedback_cycle_by_token(uuid);

CREATE OR REPLACE FUNCTION public.get_feedback_cycle_by_token(p_token uuid)
RETURNS TABLE(
  cycle_id uuid,
  colaborador_name character varying,
  milestone_type milestone_type,
  respondent_type respondent_type,
  template_id uuid,
  already_submitted boolean,
  questions jsonb,
  questionnaire_configured boolean,
  questionnaire_auto_resolved boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cycle_id UUID;
  v_respondent respondent_type;
  v_template_id UUID;
  v_company_id UUID;
  v_milestone milestone_type;
  v_auto BOOLEAN := false;
BEGIN
  SELECT fc.id, COALESCE(fc.collaborator_questionnaire_template_id, fc.questionnaire_template_id), fc.company_id, fc.milestone_type
  INTO v_cycle_id, v_template_id, v_company_id, v_milestone
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;

  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    SELECT fc.id, COALESCE(fc.gestor_questionnaire_template_id, fc.questionnaire_template_id), fc.company_id, fc.milestone_type
    INTO v_cycle_id, v_template_id, v_company_id, v_milestone
    FROM feedback_cycles fc
    WHERE fc.gestor_token = p_token;

    IF v_cycle_id IS NOT NULL THEN
      v_respondent := 'GESTOR';
    END IF;
  END IF;

  IF v_cycle_id IS NULL THEN
    RETURN;
  END IF;

  -- fallback: template não definido ou sem perguntas para este respondente
  IF v_template_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM questions q
      WHERE q.questionnaire_template_id = v_template_id
        AND (q.respondent_type = v_respondent OR q.respondent_type = 'AMBOS')
  ) THEN
    v_template_id := public.resolve_feedback_template(v_company_id, v_milestone, v_respondent);
    v_auto := v_template_id IS NOT NULL;
  END IF;

  RETURN QUERY
  SELECT
    fc.id,
    c.full_name,
    fc.milestone_type,
    v_respondent,
    v_template_id,
    EXISTS (
      SELECT 1 FROM feedback_responses fr
      WHERE fr.feedback_cycle_id = fc.id AND fr.respondent_type = v_respondent
    ),
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
    ),
    (v_template_id IS NOT NULL),
    v_auto
  FROM feedback_cycles fc
  JOIN colaboradores c ON c.id = fc.colaborador_id
  WHERE fc.id = v_cycle_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_cycle_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feedback_cycle_by_token(uuid) TO anon, authenticated, service_role;

-- Backfill de ciclos sem template
DO $$
DECLARE v_colab int; v_gestor int;
BEGIN
  WITH upd AS (
    UPDATE feedback_cycles fc
    SET collaborator_questionnaire_template_id =
        public.resolve_feedback_template(fc.company_id, fc.milestone_type, 'COLABORADOR')
    WHERE fc.collaborator_questionnaire_template_id IS NULL
      AND fc.questionnaire_template_id IS NULL
      AND public.resolve_feedback_template(fc.company_id, fc.milestone_type, 'COLABORADOR') IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO v_colab FROM upd;

  WITH upd AS (
    UPDATE feedback_cycles fc
    SET gestor_questionnaire_template_id =
        public.resolve_feedback_template(fc.company_id, fc.milestone_type, 'GESTOR')
    WHERE fc.gestor_questionnaire_template_id IS NULL
      AND fc.questionnaire_template_id IS NULL
      AND public.resolve_feedback_template(fc.company_id, fc.milestone_type, 'GESTOR') IS NOT NULL
    RETURNING 1
  ) SELECT count(*) INTO v_gestor FROM upd;

  RAISE NOTICE 'Backfill diário de bordo: % ciclos (colaborador), % ciclos (gestor)', v_colab, v_gestor;
END $$;