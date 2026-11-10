
CREATE OR REPLACE FUNCTION public.gerar_campanhas_cuidar_ano(p_company_id UUID, p_ano INT)
RETURNS TABLE(criadas_semanal INT, criadas_mensal INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_sexta DATE;
  v_data_inicio DATE;
  v_data_fim DATE;
  v_semana INT;
  v_mes INT;
  v_ultima_sexta_do_mes BOOLEAN;
  v_perguntas_pulso JSONB;
  v_perguntas_completo JSONB;
  v_campaign_id UUID;
  v_pergunta JSONB;
  v_count_sem INT := 0;
  v_count_men INT := 0;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();

  IF v_role NOT IN ('admin_master','admin_empresa') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: somente admin master ou admin empresa pode gerar campanhas';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: empresa fora do escopo';
  END IF;

  SELECT perguntas_json INTO v_perguntas_pulso
    FROM public.cuidar_templates_fixos WHERE template_key = 'pulso_rapido';
  SELECT perguntas_json INTO v_perguntas_completo
    FROM public.cuidar_templates_fixos WHERE template_key = 'completo';

  -- Primeira sexta-feira do ano como âncora de encerramento da semana
  v_sexta := make_date(p_ano, 1, 1);
  WHILE EXTRACT(ISODOW FROM v_sexta) <> 5 LOOP
    v_sexta := v_sexta + INTERVAL '1 day';
  END LOOP;

  WHILE EXTRACT(YEAR FROM v_sexta) = p_ano LOOP
    v_semana := EXTRACT(WEEK FROM v_sexta)::INT;
    v_mes := EXTRACT(MONTH FROM v_sexta)::INT;
    v_data_inicio := v_sexta - INTERVAL '4 days'; -- segunda
    v_data_fim := v_sexta;                        -- sexta
    v_ultima_sexta_do_mes := EXTRACT(MONTH FROM (v_sexta + INTERVAL '7 days')) <> v_mes;

    IF v_ultima_sexta_do_mes THEN
      -- Última semana do mês: somente Cuidar+ Mensal Completo
      BEGIN
        INSERT INTO public.pulse_campaigns(
          company_id, titulo, descricao, ativo, data_inicio, data_fim,
          tipo, origem, template_key, semana_iso, mes, ano
        ) VALUES (
          p_company_id,
          'Cuidar+ Mensal ' || to_char(v_sexta, 'MM/YYYY'),
          'Pesquisa mensal completa do Cuidar+',
          false,
          v_data_inicio, v_data_fim,
          'completo', 'auto_mensal', 'completo', v_semana, v_mes, p_ano
        ) RETURNING id INTO v_campaign_id;

        FOR v_pergunta IN SELECT * FROM jsonb_array_elements(v_perguntas_completo) LOOP
          INSERT INTO public.pulse_questions(campaign_id, pergunta, tipo, ordem, obrigatoria)
          VALUES (
            v_campaign_id,
            v_pergunta->>'pergunta',
            COALESCE((v_pergunta->>'tipo')::pulse_question_type, 'escala_0_5'::pulse_question_type),
            COALESCE((v_pergunta->>'ordem')::INT, 1),
            COALESCE((v_pergunta->>'obrigatoria')::BOOLEAN, true)
          );
        END LOOP;

        v_count_men := v_count_men + 1;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    ELSE
      -- Demais semanas: Pulso semanal
      BEGIN
        INSERT INTO public.pulse_campaigns(
          company_id, titulo, descricao, ativo, data_inicio, data_fim,
          tipo, origem, template_key, semana_iso, mes, ano
        ) VALUES (
          p_company_id,
          'Pulso da Semana ' || v_semana,
          'Pergunta semanal automática do Cuidar+',
          false,
          v_data_inicio, v_data_fim,
          'pulso', 'auto_semanal', 'pulso_rapido', v_semana, v_mes, p_ano
        ) RETURNING id INTO v_campaign_id;

        FOR v_pergunta IN SELECT * FROM jsonb_array_elements(v_perguntas_pulso) LOOP
          INSERT INTO public.pulse_questions(campaign_id, pergunta, tipo, ordem, obrigatoria)
          VALUES (
            v_campaign_id,
            v_pergunta->>'pergunta',
            COALESCE((v_pergunta->>'tipo')::pulse_question_type, 'escala_0_5'::pulse_question_type),
            COALESCE((v_pergunta->>'ordem')::INT, 1),
            COALESCE((v_pergunta->>'obrigatoria')::BOOLEAN, true)
          );
        END LOOP;

        v_count_sem := v_count_sem + 1;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;

    v_sexta := v_sexta + INTERVAL '7 days';
  END LOOP;

  RETURN QUERY SELECT v_count_sem, v_count_men;
END;
$$;

-- Limpeza das campanhas automáticas geradas com a regra antiga (somente inativas e sem respostas)
DELETE FROM public.pulse_campaigns pc
WHERE pc.origem IN ('auto_semanal','auto_mensal')
  AND pc.ativo = false
  AND pc.ano >= 2026
  AND NOT EXISTS (
    SELECT 1 FROM public.pulse_responses r WHERE r.campaign_id = pc.id
  );
