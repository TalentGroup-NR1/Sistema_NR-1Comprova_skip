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
$function$;

-- Backfill: aplica streak para o Josenildo referente à resposta de hoje (semana 22/2026)
-- NOTA: Envolvido em bloco de exceção — será pulado silenciosamente em banco novo (sem usuário)
DO $$
BEGIN
  PERFORM public.atualizar_streak_cuidar(
    '766863ae-9b46-427e-be96-76fb60ac0e9b'::uuid,
    'fcdfc7aa-f768-4547-82eb-a8bf583ff756'::uuid,
    '2026-05-25'::date
  );
EXCEPTION WHEN foreign_key_violation OR others THEN
  -- usuário não existe neste ambiente, backfill ignorado
  NULL;
END $$;