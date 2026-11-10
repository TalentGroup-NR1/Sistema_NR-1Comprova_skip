
-- Onda 7.2: Gamificação Cuidar+ (streak semanal)

CREATE TABLE IF NOT EXISTS public.cuidar_progressao (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  streak_semanal int NOT NULL DEFAULT 0,
  best_streak int NOT NULL DEFAULT 0,
  ultima_semana_respondida int,
  ultimo_ano_respondido int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuidar_progressao_company ON public.cuidar_progressao(company_id);

ALTER TABLE public.cuidar_progressao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Próprio usuário lê sua progressão"
  ON public.cuidar_progressao FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin master lê tudo"
  ON public.cuidar_progressao FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Admin empresa/RH lê da empresa"
  ON public.cuidar_progressao FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
  );

-- Sem políticas de INSERT/UPDATE para clientes: tudo via RPC SECURITY DEFINER

CREATE TRIGGER update_cuidar_progressao_updated_at
  BEFORE UPDATE ON public.cuidar_progressao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função de atualização de streak
CREATE OR REPLACE FUNCTION public.atualizar_streak_cuidar(
  p_user_id uuid,
  p_company_id uuid,
  p_data_campanha date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_semana_atual int;
  v_ano_atual int;
  v_ultima_semana int;
  v_ultimo_ano int;
  v_streak int := 0;
  v_best int := 0;
  v_consecutiva boolean := false;
  v_ultima_semana_ano_anterior int;
BEGIN
  v_semana_atual := EXTRACT(week FROM p_data_campanha)::int;
  v_ano_atual := EXTRACT(isoyear FROM p_data_campanha)::int;

  SELECT streak_semanal, best_streak, ultima_semana_respondida, ultimo_ano_respondido
    INTO v_streak, v_best, v_ultima_semana, v_ultimo_ano
  FROM public.cuidar_progressao
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.cuidar_progressao(user_id, company_id, streak_semanal, best_streak, ultima_semana_respondida, ultimo_ano_respondido)
    VALUES (p_user_id, p_company_id, 1, 1, v_semana_atual, v_ano_atual);
    RETURN;
  END IF;

  -- Já respondeu nesta mesma semana ISO: noop
  IF v_ultima_semana = v_semana_atual AND v_ultimo_ano = v_ano_atual THEN
    RETURN;
  END IF;

  -- Mesma ano-iso, semana imediatamente anterior
  IF v_ultimo_ano = v_ano_atual AND v_ultima_semana = v_semana_atual - 1 THEN
    v_consecutiva := true;
  END IF;

  -- Virada de ano-iso: semana 1 do ano atual após última semana do ano anterior
  IF NOT v_consecutiva AND v_semana_atual = 1 AND v_ultimo_ano = v_ano_atual - 1 THEN
    v_ultima_semana_ano_anterior := EXTRACT(week FROM make_date(v_ano_atual - 1, 12, 28))::int;
    IF v_ultima_semana = v_ultima_semana_ano_anterior THEN
      v_consecutiva := true;
    END IF;
  END IF;

  IF v_consecutiva THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  IF v_streak > v_best THEN
    v_best := v_streak;
  END IF;

  UPDATE public.cuidar_progressao
     SET streak_semanal = v_streak,
         best_streak = v_best,
         ultima_semana_respondida = v_semana_atual,
         ultimo_ano_respondido = v_ano_atual,
         company_id = COALESCE(p_company_id, company_id)
   WHERE user_id = p_user_id;
END;
$$;

-- Estende submit_pulse_campaign_response para chamar atualizar_streak_cuidar
CREATE OR REPLACE FUNCTION public.submit_pulse_campaign_response(
  p_campaign_id uuid, p_responses jsonb, p_comentario text DEFAULT NULL::text
)
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
BEGIN
  v_user_id := auth.uid();

  SELECT id, company_id INTO v_colaborador_id, v_company_id
  FROM public.colaboradores
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pulse_campaigns
    WHERE id = p_campaign_id
      AND company_id = v_company_id
      AND ativo = true
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
      p_campaign_id,
      (v_response->>'question_id')::UUID,
      v_colaborador_id,
      v_response->>'resposta',
      p_comentario,
      v_score
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

  -- Onda 7.2: atualizar streak apenas para campanhas semanais automáticas
  IF v_origem = 'auto_semanal' AND v_data_inicio IS NOT NULL THEN
    PERFORM public.atualizar_streak_cuidar(v_user_id, v_company_id, v_data_inicio);
  END IF;

  RETURN TRUE;
END;
$function$;
