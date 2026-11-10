
CREATE OR REPLACE FUNCTION public.replicate_questionnaire_template(p_template_id uuid, p_source_company_id uuid)
 RETURNS TABLE(company_name text, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target_company RECORD;
  v_new_template_id UUID;
  v_source RECORD;
  v_admin_user_id UUID;
BEGIN
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;
  
  v_admin_user_id := auth.uid();

  SELECT * INTO v_source 
  FROM questionnaire_templates WHERE id = p_template_id;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Template não encontrado';
  END IF;

  FOR v_target_company IN 
    SELECT id, name FROM companies 
    WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      INSERT INTO questionnaire_templates (
        template_name, description, milestone_type, target_audience,
        company_id, is_active
      ) VALUES (
        v_source.template_name, v_source.description, v_source.milestone_type,
        v_source.target_audience, v_target_company.id, v_source.is_active
      ) RETURNING id INTO v_new_template_id;

      INSERT INTO questions (
        questionnaire_template_id, question_text, question_type,
        respondent_type, scale_min, scale_max, order_index
      )
      SELECT 
        v_new_template_id, question_text, question_type,
        respondent_type, scale_min, scale_max, order_index
      FROM questions
      WHERE questionnaire_template_id = p_template_id;

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'questionnaire_template', p_template_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name;
      success := true;
      error_message := null;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'questionnaire_template', p_template_id, p_source_company_id, v_target_company.id, false, SQLERRM);

      company_name := v_target_company.name;
      success := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$function$;
