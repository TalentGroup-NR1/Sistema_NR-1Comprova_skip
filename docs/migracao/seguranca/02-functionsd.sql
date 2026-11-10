-- SEÇÃO 2: FUNCTIONS (parte 4/4)
CREATE OR REPLACE FUNCTION public.relatorio_leituras_campanha(p_campanha_id uuid)
 RETURNS TABLE(user_id uuid, nome text, departamento text, cargo text, cpf text, matricula text, email_pessoal text, lido boolean, lido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_role app_role;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.campanhas_comunicados WHERE id = p_campanha_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  v_role := get_my_role();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF v_role <> 'admin_master' AND get_user_company_id(auth.uid()) <> v_company_id THEN
    RAISE EXCEPTION 'Não autorizado para essa empresa';
  END IF;

  RETURN QUERY
  SELECT
    c.user_id,
    c.full_name::text AS nome,
    c.department::text AS departamento,
    c.job_title::text AS cargo,
    c.cpf::text AS cpf,
    c.matricula::text AS matricula,
    c.email_pessoal::text AS email_pessoal,
    (cl.lido_em IS NOT NULL) AS lido,
    cl.lido_em
  FROM public.colaboradores c
  LEFT JOIN public.campanha_leituras cl
    ON cl.campanha_id = p_campanha_id
   AND cl.user_id = c.user_id
  WHERE c.company_id = v_company_id
    AND c.status = 'ATIVO'
    AND c.user_id IS NOT NULL
  ORDER BY (cl.lido_em IS NULL) DESC, c.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.relatorio_leituras_comunicado(p_comunicado_id uuid)
 RETURNS TABLE(user_id uuid, nome text, departamento text, cargo text, cpf text, matricula text, email_pessoal text, lido boolean, lido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_publico_tipo publico_alvo_tipo;
  v_publico_valor text;
  v_role app_role;
BEGIN
  SELECT company_id, publico_alvo_tipo, publico_alvo_valor
    INTO v_company_id, v_publico_tipo, v_publico_valor
  FROM public.comunicados WHERE id = p_comunicado_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Comunicado não encontrado';
  END IF;

  v_role := get_my_role();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF v_role <> 'admin_master' AND get_user_company_id(auth.uid()) <> v_company_id THEN
    RAISE EXCEPTION 'Não autorizado para essa empresa';
  END IF;

  RETURN QUERY
  SELECT
    c.user_id,
    c.full_name::text AS nome,
    c.department::text AS departamento,
    c.job_title::text AS cargo,
    c.cpf::text AS cpf,
    c.matricula::text AS matricula,
    c.email_pessoal::text AS email_pessoal,
    (cl.read_at IS NOT NULL) AS lido,
    cl.read_at AS lido_em
  FROM public.colaboradores c
  LEFT JOIN public.comunicado_leituras cl
    ON cl.comunicado_id = p_comunicado_id
   AND cl.user_id = c.user_id
  WHERE c.company_id = v_company_id
    AND c.status = 'ATIVO'
    AND c.user_id IS NOT NULL
    AND (
      v_publico_tipo = 'todos'
      OR (v_publico_tipo = 'departamento' AND v_publico_valor = c.department)
      OR (v_publico_tipo = 'cargo' AND v_publico_valor = c.job_title)
    )
  ORDER BY (cl.read_at IS NULL) DESC, c.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_beneficios_to_all_companies(p_source_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_target record;
  v_src_ben record;
  v_new_ben_id uuid;
  v_total_targets int := 0;
  v_total_created int := 0;
  v_total_skipped int := 0;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF NOT is_admin_master(v_user_id) THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar benefícios';
  END IF;

  IF p_source_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa de origem é obrigatória';
  END IF;

  FOR v_target IN
    SELECT id, name FROM companies
    WHERE status = 'active' AND id <> p_source_company_id
  LOOP
    v_total_targets := v_total_targets + 1;

    FOR v_src_ben IN
      SELECT * FROM beneficios WHERE company_id = p_source_company_id
    LOOP
      IF EXISTS (
        SELECT 1 FROM beneficios
        WHERE company_id = v_target.id AND lower(nome) = lower(v_src_ben.nome)
      ) THEN
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO beneficios (
        company_id, nome, descricao, valor_mensal, operadora_fornecedor,
        ativo, empresa, instrucoes, importancia, link_externo, imagem_capa, categoria
      ) VALUES (
        v_target.id, v_src_ben.nome, v_src_ben.descricao, v_src_ben.valor_mensal,
        v_src_ben.operadora_fornecedor, v_src_ben.ativo, v_src_ben.empresa,
        v_src_ben.instrucoes, v_src_ben.importancia, v_src_ben.link_externo,
        v_src_ben.imagem_capa, v_src_ben.categoria
      )
      RETURNING id INTO v_new_ben_id;

      INSERT INTO beneficios_materiais (beneficio_id, tipo, titulo, arquivo_url, descricao, link_externo)
      SELECT v_new_ben_id, tipo, titulo, arquivo_url, descricao, link_externo
      FROM beneficios_materiais WHERE beneficio_id = v_src_ben.id;

      INSERT INTO beneficios_tipo_contrato (beneficio_id, tipo_contrato, company_id)
      SELECT v_new_ben_id, tipo_contrato, v_target.id
      FROM beneficios_tipo_contrato WHERE beneficio_id = v_src_ben.id;

      v_total_created := v_total_created + 1;

      INSERT INTO replication_logs (
        admin_user_id, record_type, source_record_id,
        source_company_id, target_company_id, success
      ) VALUES (
        v_user_id, 'beneficio', v_src_ben.id,
        p_source_company_id, v_target.id, true
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'total_target_companies', v_total_targets,
    'total_created', v_total_created,
    'total_skipped', v_total_skipped
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_ciclo_avaliacao(p_ciclo_id uuid, p_source_company_id uuid)
 RETURNS TABLE(company_name text, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_company RECORD;
  v_new_ciclo_id UUID;
  v_source_ciclo RECORD;
  v_metrica_map JSONB := '{}'::JSONB;
  v_new_metrica_id UUID;
  v_metrica RECORD;
  v_competencia RECORD;
  v_objetivo RECORD;
  v_admin_user_id UUID;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;

  v_admin_user_id := auth.uid();

  SELECT * INTO v_source_ciclo FROM ciclos_avaliacao WHERE id = p_ciclo_id;
  IF v_source_ciclo IS NULL THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;

  FOR v_target_company IN
    SELECT id, name FROM companies
    WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      INSERT INTO ciclos_avaliacao (
        company_id, nome_ciclo, descricao, data_inicio, data_fim, status
      ) VALUES (
        v_target_company.id, v_source_ciclo.nome_ciclo, v_source_ciclo.descricao,
        v_source_ciclo.data_inicio, v_source_ciclo.data_fim, 'configuracao'
      ) RETURNING id INTO v_new_ciclo_id;

      v_metrica_map := '{}'::JSONB;
      FOR v_metrica IN SELECT * FROM metricas_avaliacao WHERE ciclo_id = p_ciclo_id
      LOOP
        INSERT INTO metricas_avaliacao (ciclo_id, nome_metrica, tipo_metrica, valores_escala)
        VALUES (v_new_ciclo_id, v_metrica.nome_metrica, v_metrica.tipo_metrica, v_metrica.valores_escala)
        RETURNING id INTO v_new_metrica_id;
        v_metrica_map := v_metrica_map || jsonb_build_object(v_metrica.id::text, v_new_metrica_id);
      END LOOP;

      FOR v_competencia IN SELECT * FROM competencias_ciclo WHERE ciclo_id = p_ciclo_id
      LOOP
        INSERT INTO competencias_ciclo (
          ciclo_id, nome_competencia, conceito_competencia,
          texto_pergunta_autoavaliacao, texto_pergunta_gestor, metrica_id, ordem
        ) VALUES (
          v_new_ciclo_id, v_competencia.nome_competencia, v_competencia.conceito_competencia,
          v_competencia.texto_pergunta_autoavaliacao, v_competencia.texto_pergunta_gestor,
          CASE WHEN v_competencia.metrica_id IS NOT NULL
               THEN (v_metrica_map->>v_competencia.metrica_id::text)::UUID
               ELSE NULL END,
          v_competencia.ordem
        );
      END LOOP;

      FOR v_objetivo IN SELECT * FROM objetivos_ciclo WHERE ciclo_id = p_ciclo_id
      LOOP
        INSERT INTO objetivos_ciclo (
          ciclo_id, nome_objetivo, descricao_objetivo,
          texto_pergunta_autoavaliacao, texto_pergunta_gestor, metrica_id, ordem
        ) VALUES (
          v_new_ciclo_id, v_objetivo.nome_objetivo, v_objetivo.descricao_objetivo,
          v_objetivo.texto_pergunta_autoavaliacao, v_objetivo.texto_pergunta_gestor,
          CASE WHEN v_objetivo.metrica_id IS NOT NULL
               THEN (v_metrica_map->>v_objetivo.metrica_id::text)::UUID
               ELSE NULL END,
          v_objetivo.ordem
        );
      END LOOP;

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'ciclo_avaliacao', p_ciclo_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name; success := true; error_message := null; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'ciclo_avaliacao', p_ciclo_id, p_source_company_id, v_target_company.id, false, SQLERRM);
      company_name := v_target_company.name; success := false; error_message := SQLERRM; RETURN NEXT;
    END;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_comunicado(p_comunicado_id uuid, p_source_company_id uuid)
 RETURNS TABLE(company_name text, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_company RECORD;
  v_source RECORD;
  v_admin_user_id UUID;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;

  v_admin_user_id := auth.uid();
  SELECT * INTO v_source FROM comunicados WHERE id = p_comunicado_id;
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Comunicado não encontrado';
  END IF;

  FOR v_target_company IN
    SELECT id, name FROM companies WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      INSERT INTO comunicados (
        company_id, titulo, conteudo, autor_id, autor_nome,
        status, data_publicacao, publico_alvo_tipo, publico_alvo_valor, is_pinned
      ) VALUES (
        v_target_company.id, v_source.titulo, v_source.conteudo,
        v_source.autor_id, v_source.autor_nome,
        v_source.status, v_source.data_publicacao,
        v_source.publico_alvo_tipo, v_source.publico_alvo_valor, v_source.is_pinned
      );

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'comunicado', p_comunicado_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name; success := true; error_message := null; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'comunicado', p_comunicado_id, p_source_company_id, v_target_company.id, false, SQLERRM);
      company_name := v_target_company.name; success := false; error_message := SQLERRM; RETURN NEXT;
    END;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_cuidar_conteudo_to_all(p_id uuid)
 RETURNS TABLE(out_id uuid, out_origem text, out_storage_path text, out_company_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF NOT public.is_admin_master(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores master podem replicar para todas as empresas.';
  END IF;

  UPDATE public.cuidar_conteudos AS c
  SET company_id = NULL, updated_at = now()
  WHERE c.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material não encontrado.';
  END IF;

  RETURN QUERY
  SELECT c.id, c.origem, c.storage_path, c.company_id
  FROM public.cuidar_conteudos c
  WHERE c.id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_pulse_campaign(p_campaign_id uuid, p_source_company_id uuid)
 RETURNS TABLE(company_name text, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_company RECORD;
  v_new_campaign_id UUID;
  v_source_campaign RECORD;
  v_admin_user_id UUID;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;

  v_admin_user_id := auth.uid();
  SELECT * INTO v_source_campaign FROM pulse_campaigns WHERE id = p_campaign_id;
  IF v_source_campaign IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada';
  END IF;

  FOR v_target_company IN
    SELECT id, name FROM companies WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      INSERT INTO pulse_campaigns (company_id, titulo, descricao, ativo, data_inicio, data_fim)
      VALUES (v_target_company.id, v_source_campaign.titulo, v_source_campaign.descricao,
              v_source_campaign.ativo, v_source_campaign.data_inicio, v_source_campaign.data_fim)
      RETURNING id INTO v_new_campaign_id;

      INSERT INTO pulse_questions (campaign_id, pergunta, tipo, ordem, obrigatoria)
      SELECT v_new_campaign_id, pergunta, tipo, ordem, obrigatoria
      FROM pulse_questions WHERE campaign_id = p_campaign_id;

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'pulse_campaign', p_campaign_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name; success := true; error_message := null; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'pulse_campaign', p_campaign_id, p_source_company_id, v_target_company.id, false, SQLERRM);
      company_name := v_target_company.name; success := false; error_message := SQLERRM; RETURN NEXT;
    END;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_questionario_cuidar_plus(p_questionario_id uuid, p_source_company_id uuid)
 RETURNS TABLE(company_name text, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_company RECORD;
  v_new_questionario_id UUID;
  v_source RECORD;
  v_admin_user_id UUID;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;

  v_admin_user_id := auth.uid();
  SELECT * INTO v_source FROM questionarios_cuidar_plus WHERE id = p_questionario_id;
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Questionário não encontrado';
  END IF;

  FOR v_target_company IN
    SELECT id, name FROM companies WHERE id != p_source_company_id AND status = 'active'
  LOOP
    BEGIN
      INSERT INTO questionarios_cuidar_plus (
        company_id, titulo, descricao, is_active, modelo_analise,
        escala_config, config_calculo, created_by_user_id
      ) VALUES (
        v_target_company.id, v_source.titulo, v_source.descricao,
        v_source.is_active, v_source.modelo_analise,
        v_source.escala_config, v_source.config_calculo, v_admin_user_id
      ) RETURNING id INTO v_new_questionario_id;

      INSERT INTO perguntas_cuidar_plus (
        questionario_id, pergunta_texto, tipo_pergunta, order_index,
        dimensao, dimensao_questionario_id, is_invertida, bloco, peso
      )
      SELECT v_new_questionario_id, pergunta_texto, tipo_pergunta, order_index,
             dimensao, NULL, is_invertida, bloco, peso
      FROM perguntas_cuidar_plus
      WHERE questionario_id = p_questionario_id;

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'questionario_cuidar_plus', p_questionario_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name; success := true; error_message := null; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'questionario_cuidar_plus', p_questionario_id, p_source_company_id, v_target_company.id, false, SQLERRM);
      company_name := v_target_company.name; success := false; error_message := SQLERRM; RETURN NEXT;
    END;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replicate_questionnaire_template(p_template_id uuid, p_source_company_id uuid)
 RETURNS TABLE(company_name text, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_target_company RECORD;
  v_new_template_id UUID;
  v_source RECORD;
  v_admin_user_id UUID;
BEGIN
  PERFORM public.require_admin_role();   -- <<< GUARD INJETADO
  IF get_my_role() != 'admin_master' THEN
    RAISE EXCEPTION 'Apenas admin_master pode replicar registros';
  END IF;

  v_admin_user_id := auth.uid();
  SELECT * INTO v_source FROM questionnaire_templates WHERE id = p_template_id;
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Template não encontrado';
  END IF;

  FOR v_target_company IN
    SELECT id, name FROM companies WHERE id != p_source_company_id AND status = 'active'
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
      SELECT v_new_template_id, question_text, question_type,
             respondent_type, scale_min, scale_max, order_index
      FROM questions
      WHERE questionnaire_template_id = p_template_id;

      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success)
      VALUES (v_admin_user_id, 'questionnaire_template', p_template_id, p_source_company_id, v_target_company.id, true);

      company_name := v_target_company.name; success := true; error_message := null; RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO replication_logs (admin_user_id, record_type, source_record_id, source_company_id, target_company_id, success, error_message)
      VALUES (v_admin_user_id, 'questionnaire_template', p_template_id, p_source_company_id, v_target_company.id, false, SQLERRM);
      company_name := v_target_company.name; success := false; error_message := SQLERRM; RETURN NEXT;
    END;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.require_admin_role()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin_master')
    OR public.has_role(auth.uid(), 'admin_empresa')
    OR public.has_role(auth.uid(), 'analista_rh')
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: role insuficiente' USING ERRCODE = '42501';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_feedback_template(p_company_id uuid, p_milestone milestone_type, p_respondent respondent_type)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_consent(p_collaborator_id uuid, p_consent_type text, p_grant boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_colab public.colaboradores%ROWTYPE;
BEGIN
  SELECT * INTO v_colab FROM public.colaboradores WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.lgpd_can_manage(v_colab.company_id, false) THEN
    RAISE EXCEPTION 'Sem permissão para alterar consentimentos deste colaborador';
  END IF;
  IF p_consent_type NOT IN ('rh_data','feedback','training','communications') THEN
    RAISE EXCEPTION 'Tipo de consentimento inválido';
  END IF;
  IF p_consent_type = 'rh_data' AND NOT p_grant THEN
    RAISE EXCEPTION 'O consentimento de dados de RH é obrigatório para o uso do sistema';
  END IF;

  INSERT INTO public.collaborator_consents (collaborator_id, company_id, consent_type, consent_given, consent_date, revoked_date, revoked_by)
  VALUES (p_collaborator_id, v_colab.company_id, p_consent_type, p_grant,
          CASE WHEN p_grant THEN now() ELSE now() END,
          CASE WHEN p_grant THEN NULL ELSE now() END,
          CASE WHEN p_grant THEN NULL ELSE auth.uid() END)
  ON CONFLICT (collaborator_id, consent_type) DO UPDATE
    SET consent_given = EXCLUDED.consent_given,
        consent_date = CASE WHEN EXCLUDED.consent_given THEN now() ELSE public.collaborator_consents.consent_date END,
        revoked_date = CASE WHEN EXCLUDED.consent_given THEN NULL ELSE now() END,
        revoked_by = CASE WHEN EXCLUDED.consent_given THEN NULL ELSE auth.uid() END;

  INSERT INTO public.lgpd_audit_logs (action, collaborator_id, collaborator_name, requested_by, company_id, details)
  VALUES (CASE WHEN p_grant THEN 'grant_consent' ELSE 'revoke_consent' END,
          p_collaborator_id, v_colab.full_name, auth.uid(), v_colab.company_id,
          jsonb_build_object('consent_type', p_consent_type,
                             'descricao', format('%s de consentimento (%s) - Colaborador: %s',
                                                 CASE WHEN p_grant THEN 'Concessão' ELSE 'Revogação' END,
                                                 p_consent_type, v_colab.full_name)));

  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_cbo(p_termo text)
 RETURNS TABLE(codigo text, titulo text, descricao text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT c.codigo, c.titulo, c.descricao
  FROM public.cbo_ocupacoes c
  WHERE p_termo IS NULL OR btrim(p_termo) = ''
     OR c.codigo ILIKE '%' || btrim(p_termo) || '%'
     OR c.titulo ILIKE '%' || btrim(p_termo) || '%'
  ORDER BY c.titulo
  LIMIT 30;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_tipos_abono_nova_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.ponto_tipos_abono (company_id, codigo, nome, dias_maximos_sugeridos, base_legal, exige_anexo)
  VALUES
    (NEW.id, 'ATESTADO_MEDICO', 'Atestado Médico', 15, 'Lei 8.213/91 Art. 60', false),
    (NEW.id, 'LICENCA_CASAMENTO', 'Licença Casamento', 3, 'CLT Art. 473, II', false),
    (NEW.id, 'LICENCA_OBITO', 'Licença Óbito (família)', 2, 'CLT Art. 473, I', false),
    (NEW.id, 'LICENCA_PATERNIDADE', 'Licença Paternidade', 5, 'CF Art. 7º, XIX', false),
    (NEW.id, 'DOACAO_SANGUE', 'Doação de Sangue', 1, 'CLT Art. 473, IV', false),
    (NEW.id, 'ALISTAMENTO', 'Alistamento Militar/Eleitoral', 2, 'CLT Art. 473, III/VI', false),
    (NEW.id, 'VESTIBULAR', 'Vestibular/ENEM', 3, 'CLT Art. 473, VII', false),
    (NEW.id, 'OUTROS', 'Outros (motivo livre)', NULL, NULL, false)
  ON CONFLICT (company_id, codigo) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_proart_ativacao_company_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company uuid;
BEGIN
  SELECT public.get_my_role() INTO v_role;
  SELECT public.get_my_company_id() INTO v_company;

  IF TG_OP = 'INSERT' THEN
    IF NEW.company_id IS NULL THEN
      IF v_role = 'admin_master' THEN
        -- admin_master deve informar company_id explicitamente
        RAISE EXCEPTION 'company_id obrigatório para admin_master';
      END IF;
      NEW.company_id := v_company;
    END IF;
    IF NEW.criado_por IS NULL THEN
      NEW.criado_por := auth.uid();
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_proart_company_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.colaboradores WHERE id = NEW.colaborador_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_avaliacao_responses(p_token text, p_respostas_competencias json, p_respostas_objetivos json, p_finalizar boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link avaliacao_links%ROWTYPE;
  v_avaliacao avaliacoes%ROWTYPE;
  v_ciclo ciclos_avaliacao%ROWTYPE;
  v_respondente public.respondente_avaliacao_tipo;
  v_status public.avaliacao_status;
  v_resp RECORD;
BEGIN
  -- Get and validate link
  SELECT * INTO v_link FROM avaliacao_links WHERE token = p_token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Token expirado';
  END IF;
  
  -- Get avaliacao
  SELECT * INTO v_avaliacao FROM avaliacoes WHERE id = v_link.avaliacao_id;
  
  -- Get ciclo and check if finalized
  SELECT * INTO v_ciclo FROM ciclos_avaliacao WHERE id = v_avaliacao.ciclo_id;
  
  IF v_ciclo.status = 'finalizado' THEN
    RAISE EXCEPTION 'Este ciclo de avaliação foi finalizado e não aceita mais respostas';
  END IF;
  
  -- Determine respondente and check status
  IF v_link.tipo = 'autoavaliacao' THEN
    v_respondente := 'colaborador';
    IF v_avaliacao.status_autoavaliacao = 'concluida' THEN
      RAISE EXCEPTION 'Avaliação já foi finalizada';
    END IF;
  ELSE
    v_respondente := 'gestor';
    IF v_avaliacao.status_avaliacao_gestor = 'concluida' THEN
      RAISE EXCEPTION 'Avaliação já foi finalizada';
    END IF;
  END IF;
  
  -- Determine new status
  IF p_finalizar THEN
    v_status := 'concluida';
  ELSE
    v_status := 'em_andamento';
  END IF;
  
  -- Upsert competencia responses
  IF p_respostas_competencias IS NOT NULL THEN
    FOR v_resp IN SELECT * FROM json_to_recordset(p_respostas_competencias) AS x(competencia_id UUID, nota_valor TEXT, comentario TEXT)
    LOOP
      INSERT INTO avaliacao_respostas_competencias (avaliacao_id, competencia_id, respondente_tipo, nota_valor, comentario)
      VALUES (v_avaliacao.id, v_resp.competencia_id, v_respondente, v_resp.nota_valor, v_resp.comentario)
      ON CONFLICT (avaliacao_id, competencia_id, respondente_tipo)
      DO UPDATE SET nota_valor = EXCLUDED.nota_valor, comentario = EXCLUDED.comentario, updated_at = now();
    END LOOP;
  END IF;
  
  -- Upsert objetivo responses
  IF p_respostas_objetivos IS NOT NULL THEN
    FOR v_resp IN SELECT * FROM json_to_recordset(p_respostas_objetivos) AS x(objetivo_id UUID, nota_valor TEXT, comentario TEXT)
    LOOP
      INSERT INTO avaliacao_respostas_objetivos (avaliacao_id, objetivo_id, respondente_tipo, nota_valor, comentario)
      VALUES (v_avaliacao.id, v_resp.objetivo_id, v_respondente, v_resp.nota_valor, v_resp.comentario)
      ON CONFLICT (avaliacao_id, objetivo_id, respondente_tipo)
      DO UPDATE SET nota_valor = EXCLUDED.nota_valor, comentario = EXCLUDED.comentario, updated_at = now();
    END LOOP;
  END IF;
  
  -- Update avaliacao status
  IF v_link.tipo = 'autoavaliacao' THEN
    UPDATE avaliacoes SET status_autoavaliacao = v_status, updated_at = now() WHERE id = v_avaliacao.id;
  ELSE
    UPDATE avaliacoes SET status_avaliacao_gestor = v_status, updated_at = now() WHERE id = v_avaliacao.id;
  END IF;
  
  -- Mark link as used if finalizing
  IF p_finalizar THEN
    UPDATE avaliacao_links SET used_at = now() WHERE id = v_link.id;
  END IF;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_cuidar_plus_responses(p_token uuid, p_respostas jsonb, p_deseja_contato boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_envio RECORD;
  v_session_id UUID;
  v_resposta JSONB;
BEGIN
  -- Buscar envio
  SELECT e.id, e.status, e.colaborador_id, q.id as questionario_id
  INTO v_envio
  FROM envios_cuidar_plus e
  JOIN questionarios_cuidar_plus q ON q.id = e.questionario_id
  WHERE e.token = p_token;
  
  IF v_envio IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF v_envio.status = 'RESPONDIDO' THEN
    RAISE EXCEPTION 'Este questionário já foi respondido';
  END IF;
  
  -- Gerar session_id anônimo
  v_session_id := gen_random_uuid();
  
  -- Inserir respostas
  FOR v_resposta IN SELECT * FROM jsonb_array_elements(p_respostas)
  LOOP
    INSERT INTO respostas_cuidar_plus (
      questionario_id,
      pergunta_id,
      session_id,
      resposta_valor,
      deseja_contato,
      colaborador_id_identificado
    ) VALUES (
      v_envio.questionario_id,
      (v_resposta->>'pergunta_id')::UUID,
      v_session_id,
      v_resposta->>'resposta_valor',
      p_deseja_contato,
      -- PRIVACIDADE: Só vincula ao colaborador se deseja contato
      CASE WHEN p_deseja_contato THEN v_envio.colaborador_id ELSE NULL END
    );
  END LOOP;
  
  -- Marcar envio como respondido
  UPDATE envios_cuidar_plus 
  SET status = 'RESPONDIDO', responded_at = now()
  WHERE id = v_envio.id;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_feedback_responses(p_token uuid, p_responses jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cycle_id UUID;
  v_respondent respondent_type;
  v_response JSONB;
  v_current_status feedback_cycle_status;
  v_new_status feedback_cycle_status;
BEGIN
  -- Identificar ciclo e tipo de respondente
  SELECT fc.id, fc.status INTO v_cycle_id, v_current_status
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;
  
  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    SELECT fc.id, fc.status INTO v_cycle_id, v_current_status
    FROM feedback_cycles fc
    WHERE fc.gestor_token = p_token;
    
    IF v_cycle_id IS NOT NULL THEN
      v_respondent := 'GESTOR';
    ELSE
      RAISE EXCEPTION 'Token inválido';
    END IF;
  END IF;
  
  -- Verificar se já respondeu
  IF EXISTS (
    SELECT 1 FROM feedback_responses fr 
    WHERE fr.feedback_cycle_id = v_cycle_id 
    AND fr.respondent_type = v_respondent
  ) THEN
    RAISE EXCEPTION 'Este formulário já foi respondido';
  END IF;
  
  -- Inserir respostas
  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    INSERT INTO feedback_responses (
      feedback_cycle_id,
      question_id,
      respondent_type,
      answer_value_numeric,
      answer_value_text
    ) VALUES (
      v_cycle_id,
      (v_response->>'question_id')::UUID,
      v_respondent,
      (v_response->>'answer_value_numeric')::INTEGER,
      v_response->>'answer_value_text'
    );
  END LOOP;
  
  -- Atualizar status do ciclo
  IF v_respondent = 'COLABORADOR' THEN
    IF v_current_status = 'GESTOR_RESPONDIDO' THEN
      v_new_status := 'CONCLUIDO';
    ELSE
      v_new_status := 'COLAB_RESPONDIDO';
    END IF;
  ELSE -- GESTOR
    IF v_current_status = 'COLAB_RESPONDIDO' THEN
      v_new_status := 'CONCLUIDO';
    ELSE
      v_new_status := 'GESTOR_RESPONDIDO';
    END IF;
  END IF;
  
  UPDATE feedback_cycles SET status = v_new_status WHERE id = v_cycle_id;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_pulse_campaign_response(p_campaign_id uuid, p_responses jsonb, p_comentario text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_user_id UUID;
  v_response JSONB;
  v_tipo TEXT;
  v_score NUMERIC(5,2);
  v_origem TEXT;
  v_ano INT;
  v_semana INT;
  v_mes INT;
  v_data_inicio DATE;
  v_valor NUMERIC;
  v_score_medio NUMERIC(5,2);
BEGIN
  v_user_id := auth.uid();

  SELECT id, company_id INTO v_colaborador_id, v_company_id
  FROM public.colaboradores WHERE user_id = v_user_id LIMIT 1;

  IF v_colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pulse_campaigns
    WHERE id = p_campaign_id AND company_id = v_company_id AND ativo = true
      AND CURRENT_DATE BETWEEN data_inicio AND data_fim
  ) THEN
    RAISE EXCEPTION 'Campanha não está ativa ou não existe';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pulse_responses
    WHERE campaign_id = p_campaign_id AND employee_id = v_colaborador_id
  ) THEN
    RAISE EXCEPTION 'Você já respondeu esta campanha';
  END IF;

  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    SELECT tipo::text INTO v_tipo
      FROM public.pulse_questions
     WHERE id = (v_response->>'question_id')::UUID;

    v_score := NULL;
    IF v_tipo IN ('escala_0_5','emoji_5') THEN
      BEGIN
        v_valor := (v_response->>'resposta')::NUMERIC;
        IF v_valor IS NOT NULL THEN
          v_valor := GREATEST(0, LEAST(5, v_valor));
          v_score := ROUND((v_valor / 5.0) * 100, 2);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_score := NULL;
      END;
    END IF;

    INSERT INTO public.pulse_responses (
      campaign_id, question_id, employee_id, resposta, comentario, score_numeric
    ) VALUES (
      p_campaign_id, (v_response->>'question_id')::UUID, v_colaborador_id,
      v_response->>'resposta', p_comentario, v_score
    );
  END LOOP;

  SELECT origem, ano, semana_iso, mes, data_inicio
    INTO v_origem, v_ano, v_semana, v_mes, v_data_inicio
  FROM public.pulse_campaigns WHERE id = p_campaign_id;

  IF v_origem = 'auto_semanal' AND v_ano IS NOT NULL AND v_semana IS NOT NULL THEN
    PERFORM public.recalcular_insights_cuidar(v_company_id, 'semana', v_ano, v_semana, NULL);
  ELSIF v_origem = 'auto_mensal' AND v_ano IS NOT NULL AND v_mes IS NOT NULL THEN
    PERFORM public.recalcular_insights_cuidar(v_company_id, 'mes', v_ano, NULL, v_mes);
  END IF;

  -- Streak conta tanto pulsos semanais quanto a pesquisa mensal (ambos representam "cuidar de si na semana")
  IF v_origem IN ('auto_semanal','auto_mensal') AND v_data_inicio IS NOT NULL THEN
    PERFORM public.atualizar_streak_cuidar(v_user_id, v_company_id, v_data_inicio);
  END IF;

  IF v_origem IN ('auto_semanal','auto_mensal') THEN
    SELECT ROUND(AVG(score_numeric)::numeric, 2) INTO v_score_medio
      FROM public.pulse_responses
     WHERE campaign_id = p_campaign_id AND employee_id = v_colaborador_id
       AND score_numeric IS NOT NULL;

    IF v_score_medio IS NOT NULL THEN
      PERFORM public.gerar_badges_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
      PERFORM public.gerar_recomendacoes_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
      PERFORM public.gerar_alertas_individuais_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
      IF v_ano IS NOT NULL AND v_semana IS NOT NULL THEN
        PERFORM public.gerar_alertas_coletivos_cuidar(v_company_id, v_ano, v_semana);
      END IF;
    END IF;
  END IF;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.suspender_empresa(_company_id uuid, _ativar boolean, _ip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company record;
  v_new_status text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT id, name, is_internal, status INTO v_company
  FROM public.companies WHERE id = _company_id;

  IF v_company.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  IF v_company.is_internal AND NOT _ativar THEN
    RAISE EXCEPTION 'Empresas internas não podem ser suspensas';
  END IF;

  v_new_status := CASE WHEN _ativar THEN 'active' ELSE 'suspended' END;

  UPDATE public.companies
  SET status = v_new_status, updated_at = now()
  WHERE id = _company_id;

  INSERT INTO public.platform_audit_logs (user_id, user_email, action, target_company_id, target_company_name, ip_address, details)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    CASE WHEN _ativar THEN 'empresa_ativada' ELSE 'empresa_suspensa' END,
    _company_id,
    v_company.name,
    _ip,
    jsonb_build_object('status_anterior', v_company.status, 'status_novo', v_new_status)
  );

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_colaborador_cargo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_nome text;
BEGIN
  IF NEW.cargo_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.cargo_id IS DISTINCT FROM OLD.cargo_id) THEN
    SELECT c.nome INTO v_nome FROM public.cargos c WHERE c.id = NEW.cargo_id;
    IF v_nome IS NOT NULL THEN NEW.job_title := v_nome; END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_metricas_valores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_valor JSONB;
  v_ordem INT := 0;
  v_peso NUMERIC;
BEGIN
  -- Remover valores antigos se existirem
  DELETE FROM metricas_valores WHERE metrica_id = NEW.id;
  
  -- Inserir novos valores baseados em valores_escala
  FOR v_valor IN SELECT * FROM jsonb_array_elements(NEW.valores_escala::jsonb)
  LOOP
    v_ordem := v_ordem + 1;
    
    -- Para métricas numéricas, o peso é igual ao valor numérico
    -- Para métricas descritivas, o peso é a ordem (crescente)
    IF NEW.tipo_metrica = 'numerica' THEN
      v_peso := COALESCE((v_valor->>'valor')::NUMERIC, v_ordem);
    ELSE
      v_peso := v_ordem;
    END IF;
    
    INSERT INTO metricas_valores (metrica_id, valor_label, peso, ordem)
    VALUES (
      NEW.id,
      COALESCE(v_valor->>'valor', v_valor->>'label')::TEXT,
      v_peso,
      v_ordem
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_profile_is_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When colaborador becomes DESLIGADO, deactivate profile
  IF NEW.status = 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_active = false WHERE user_id = NEW.user_id;
  END IF;
  
  -- When colaborador is reactivated from DESLIGADO, activate profile
  IF OLD.status = 'DESLIGADO' AND NEW.status != 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_active = true WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_ferias_gozo_auto_periodo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_match uuid;
BEGIN
  v_match := public.pick_periodo_aquisitivo_for_gozo(NEW.colaborador_id, NEW.data_inicio_gozo);
  IF v_match IS NOT NULL THEN
    NEW.periodo_aquisitivo_id := v_match;
  END IF;
  -- Se não houver match, mantém o que veio (evita quebrar inserts antes do sync de períodos)
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.transferir_colaborador(p_colaborador_id uuid, p_empresa_destino_id uuid, p_motivo text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin_master boolean;
  v_is_admin_empresa boolean;
  v_is_analista_rh boolean;
  v_my_company uuid;
  v_origem uuid;
  v_destino_status text;
  v_destino_nome text;
  v_destino_cliente text;
  v_transf_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_is_admin_master  := public.has_role(v_uid, 'admin_master');
  v_is_admin_empresa := public.has_role(v_uid, 'admin_empresa');
  v_is_analista_rh   := public.has_role(v_uid, 'analista_rh');

  IF NOT (v_is_admin_master OR v_is_admin_empresa OR v_is_analista_rh) THEN
    RAISE EXCEPTION 'Sem permissão para transferir colaborador' USING ERRCODE = '42501';
  END IF;

  SELECT company_id INTO v_origem
  FROM public.colaboradores WHERE id = p_colaborador_id;

  IF v_origem IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  SELECT status, name, empresa_cliente
    INTO v_destino_status, v_destino_nome, v_destino_cliente
  FROM public.companies WHERE id = p_empresa_destino_id;

  IF v_destino_nome IS NULL THEN
    RAISE EXCEPTION 'Empresa destino não encontrada';
  END IF;

  IF v_destino_status <> 'active' THEN
    RAISE EXCEPTION 'Empresa destino inativa';
  END IF;

  IF v_origem = p_empresa_destino_id THEN
    RAISE EXCEPTION 'Colaborador já pertence a esta empresa';
  END IF;

  IF NOT v_is_admin_master THEN
    v_my_company := public.get_my_company_id();
    IF v_my_company IS NULL OR v_origem <> v_my_company THEN
      RAISE EXCEPTION 'Você só pode transferir colaboradores da sua empresa' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.colaboradores
     SET company_id = p_empresa_destino_id,
         updated_at = now()
   WHERE id = p_colaborador_id;

  INSERT INTO public.transferencias_colaborador
    (colaborador_id, empresa_origem_id, empresa_destino_id, transferido_por, motivo)
  VALUES
    (p_colaborador_id, v_origem, p_empresa_destino_id, v_uid, COALESCE(p_motivo, ''))
  RETURNING id INTO v_transf_id;

  RETURN jsonb_build_object(
    'transferencia_id', v_transf_id,
    'colaborador_id', p_colaborador_id,
    'empresa_origem_id', v_origem,
    'empresa_destino_id', p_empresa_destino_id,
    'empresa_destino_nome', COALESCE(NULLIF(TRIM(v_destino_cliente), ''), v_destino_nome)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_cfg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NEW.jornada_diaria_minutos IS DISTINCT FROM OLD.jornada_diaria_minutos
     OR NEW.tolerancia_minutos IS DISTINCT FROM OLD.tolerancia_minutos
     OR NEW.bonus_fora_escala_ativo IS DISTINCT FROM OLD.bonus_fora_escala_ativo
     OR NEW.bonus_sabado_pct IS DISTINCT FROM OLD.bonus_sabado_pct
     OR NEW.bonus_domingo_pct IS DISTINCT FROM OLD.bonus_domingo_pct
     OR NEW.bonus_feriado_pct IS DISTINCT FROM OLD.bonus_feriado_pct THEN
    FOR r IN
      SELECT prd.colaborador_id, prd.data
        FROM public.ponto_resumo_diario prd
        JOIN public.colaboradores c ON c.id = prd.colaborador_id
       WHERE c.company_id = NEW.company_id
    LOOP
      PERFORM public.recalcular_resumo_diario(r.colaborador_id, r.data);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_colab()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NEW.jornada_diaria_minutos IS DISTINCT FROM OLD.jornada_diaria_minutos
     OR NEW.work_schedule_id IS DISTINCT FROM OLD.work_schedule_id THEN
    FOR r IN
      SELECT data FROM public.ponto_resumo_diario
       WHERE colaborador_id = NEW.id
    LOOP
      PERFORM public.recalcular_resumo_diario(NEW.id, r.data);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colab uuid;
  v_data date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_colab := OLD.colaborador_id;
    v_data := (OLD.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;
  ELSE
    v_colab := NEW.colaborador_id;
    v_data := (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;
  END IF;
  PERFORM public.recalcular_resumo_diario(v_colab, v_data);
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_recalc_resumo_ws()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NEW.carga_diaria_minutos IS DISTINCT FROM OLD.carga_diaria_minutos
     OR NEW.tolerancia_minutos IS DISTINCT FROM OLD.tolerancia_minutos
     OR NEW.dias_semana IS DISTINCT FROM OLD.dias_semana
     OR NEW.trabalha_feriados IS DISTINCT FROM OLD.trabalha_feriados THEN
    FOR r IN
      SELECT prd.colaborador_id, prd.data
        FROM public.ponto_resumo_diario prd
        JOIN public.colaboradores c ON c.id = prd.colaborador_id
       WHERE c.work_schedule_id = NEW.id
    LOOP
      PERFORM public.recalcular_resumo_diario(r.colaborador_id, r.data);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_sequencia_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_dia date;
  v_ultimo text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.ajuste_manual IS TRUE THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ponto:' || NEW.colaborador_id::text));

  v_dia := (NEW.data_hora AT TIME ZONE 'America/Sao_Paulo')::date;

  SELECT tipo::text INTO v_ultimo
  FROM public.ponto_registros
  WHERE colaborador_id = NEW.colaborador_id
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = v_dia
    AND data_hora < NEW.data_hora
    AND status_aprovacao <> 'rejeitado'
  ORDER BY data_hora DESC
  LIMIT 1;

  IF v_ultimo IS NULL THEN
    IF NEW.tipo::text <> 'ENTRADA' THEN
      RAISE EXCEPTION 'Sequência inválida: primeira batida do dia deve ser ENTRADA (recebido %)', NEW.tipo
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_ultimo = 'ENTRADA' AND NEW.tipo::text <> 'SAIDA' THEN
    RAISE EXCEPTION 'Sequência inválida: após ENTRADA deve vir SAIDA (recebido %)', NEW.tipo
      USING ERRCODE = 'check_violation';
  ELSIF v_ultimo = 'SAIDA' AND NEW.tipo::text <> 'ENTRADA' THEN
    RAISE EXCEPTION 'Sequência inválida: após SAIDA deve vir ENTRADA (recebido %)', NEW.tipo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_campanha_datas()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.data_inicio > NEW.data_fim THEN
    RAISE EXCEPTION 'Data de início deve ser anterior ou igual à data de fim';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_certificate(p_code text)
 RETURNS TABLE(is_valid boolean, colaborador_nome character varying, treinamento_titulo character varying, carga_horaria integer, data_conclusao timestamp with time zone, issue_date timestamp with time zone, status character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.status = 'ativo' AS is_valid,
    c.colaborador_nome,
    c.treinamento_titulo,
    c.carga_horaria,
    c.data_conclusao,
    c.issue_date,
    c.status
  FROM public.certificates c
  WHERE c.certificate_code = p_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_colaborador_ferias_legado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_fim IS NULL THEN
    RAISE EXCEPTION 'ultima_ferias_fim é obrigatório quando ultima_ferias_inicio for informado';
  END IF;
  IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_fim IS NOT NULL
     AND NEW.ultima_ferias_fim < NEW.ultima_ferias_inicio THEN
    RAISE EXCEPTION 'ultima_ferias_fim não pode ser anterior a ultima_ferias_inicio';
  END IF;
  IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_inicio > CURRENT_DATE THEN
    RAISE EXCEPTION 'ultima_ferias_inicio não pode ser uma data futura';
  END IF;
  IF NEW.ultima_ferias_fim IS NOT NULL AND NEW.ultima_ferias_fim > CURRENT_DATE THEN
    RAISE EXCEPTION 'ultima_ferias_fim não pode ser uma data futura';
  END IF;
  IF NEW.data_corte_ferias IS NOT NULL AND NEW.data_corte_ferias > CURRENT_DATE THEN
    RAISE EXCEPTION 'data_corte_ferias não pode ser uma data futura';
  END IF;
  IF NEW.admission_date IS NOT NULL THEN
    IF NEW.ultima_ferias_inicio IS NOT NULL AND NEW.ultima_ferias_inicio < NEW.admission_date THEN
      RAISE EXCEPTION 'ultima_ferias_inicio não pode ser anterior à data de admissão';
    END IF;
    IF NEW.ultima_ferias_fim IS NOT NULL AND NEW.ultima_ferias_fim < NEW.admission_date THEN
      RAISE EXCEPTION 'ultima_ferias_fim não pode ser anterior à data de admissão';
    END IF;
    IF NEW.data_corte_ferias IS NOT NULL AND NEW.data_corte_ferias < NEW.admission_date THEN
      RAISE EXCEPTION 'data_corte_ferias não pode ser anterior à data de admissão';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_faixas_hora_extra()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  grupo text;
  faixas jsonb;
  faixa jsonb;
  prev_ate numeric;
  curr_ate numeric;
  pct numeric;
  i int;
  total int;
BEGIN
  IF NEW.faixas_hora_extra IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH grupo IN ARRAY ARRAY['dia_util','sabado','domingo_feriado'] LOOP
    faixas := NEW.faixas_hora_extra -> grupo;
    IF faixas IS NULL OR jsonb_typeof(faixas) <> 'array' OR jsonb_array_length(faixas) < 1 THEN
      RAISE EXCEPTION 'Grupo % deve ter pelo menos 1 faixa', grupo;
    END IF;
    total := jsonb_array_length(faixas);
    IF total > 5 THEN
      RAISE EXCEPTION 'Grupo % excede o limite de 5 faixas', grupo;
    END IF;
    prev_ate := NULL;
    FOR i IN 0..total-1 LOOP
      faixa := faixas -> i;
      pct := (faixa ->> 'percentual')::numeric;
      IF pct IS NULL OR pct < 0 OR pct > 500 THEN
        RAISE EXCEPTION 'Percentual inválido em % (faixa %)', grupo, i+1;
      END IF;
      IF (faixa ->> 'ate_horas') IS NULL THEN
        curr_ate := NULL;
        IF i <> total-1 THEN
          RAISE EXCEPTION 'Somente a última faixa de % pode ter ate_horas nulo', grupo;
        END IF;
      ELSE
        curr_ate := (faixa ->> 'ate_horas')::numeric;
        IF curr_ate <= 0 THEN
          RAISE EXCEPTION 'ate_horas deve ser maior que zero em %', grupo;
        END IF;
        IF prev_ate IS NOT NULL AND curr_ate <= prev_ate THEN
          RAISE EXCEPTION 'ate_horas deve ser crescente em %', grupo;
        END IF;
        IF i = total-1 THEN
          RAISE EXCEPTION 'A última faixa de % deve ter ate_horas nulo (sem teto)', grupo;
        END IF;
        prev_ate := curr_ate;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_horarios_por_dia()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  k TEXT;
  v JSONB;
  hhmm TEXT := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  carga INT;
BEGIN
  IF NEW.horarios_por_dia IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.horarios_por_dia) <> 'object' THEN
    RAISE EXCEPTION 'horarios_por_dia must be a JSON object';
  END IF;

  FOR k, v IN SELECT * FROM jsonb_each(NEW.horarios_por_dia) LOOP
    IF k !~ '^[0-6]$' THEN
      RAISE EXCEPTION 'horarios_por_dia keys must be 0..6 (got %)', k;
    END IF;
    IF jsonb_typeof(v) <> 'object' THEN
      RAISE EXCEPTION 'horarios_por_dia entries must be objects';
    END IF;
    -- optional time fields
    IF v ? 'em' AND jsonb_typeof(v->'em') = 'string' AND (v->>'em') !~ hhmm THEN
      RAISE EXCEPTION 'invalid em time on day %', k;
    END IF;
    IF v ? 'sm' AND jsonb_typeof(v->'sm') = 'string' AND (v->>'sm') !~ hhmm THEN
      RAISE EXCEPTION 'invalid sm time on day %', k;
    END IF;
    IF v ? 'et' AND jsonb_typeof(v->'et') = 'string' AND (v->>'et') !~ hhmm THEN
      RAISE EXCEPTION 'invalid et time on day %', k;
    END IF;
    IF v ? 'st' AND jsonb_typeof(v->'st') = 'string' AND (v->>'st') !~ hhmm THEN
      RAISE EXCEPTION 'invalid st time on day %', k;
    END IF;
    IF v ? 'carga' THEN
      carga := (v->>'carga')::INT;
      IF carga < 1 OR carga > 1440 THEN
        RAISE EXCEPTION 'carga on day % must be between 1 and 1440', k;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_notification_priority()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.priority NOT IN ('low', 'normal', 'high') THEN
    NEW.priority := 'normal';
  END IF;
  RETURN NEW;
END;
$function$
;
