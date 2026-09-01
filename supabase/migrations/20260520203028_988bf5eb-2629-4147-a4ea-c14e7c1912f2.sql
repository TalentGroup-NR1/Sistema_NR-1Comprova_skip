
-- Onda 7.3: Badges de humor do Cuidar+

CREATE TABLE IF NOT EXISTS public.cuidar_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  campanha_id uuid REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  badge_tipo text NOT NULL,
  badge_label text NOT NULL,
  badge_descricao text NOT NULL,
  score numeric(5,2),
  ano int,
  semana_iso int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campanha_id, badge_tipo)
);

CREATE INDEX IF NOT EXISTS idx_cuidar_badges_company_semana
  ON public.cuidar_badges(company_id, ano, semana_iso);
CREATE INDEX IF NOT EXISTS idx_cuidar_badges_user_created
  ON public.cuidar_badges(user_id, created_at DESC);

ALTER TABLE public.cuidar_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Próprio usuário lê seus badges"
  ON public.cuidar_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin master lê tudo (badges)"
  ON public.cuidar_badges FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Admin empresa/RH lê badges da empresa"
  ON public.cuidar_badges FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
  );

-- Sem políticas de INSERT/UPDATE/DELETE: tudo via RPC SECURITY DEFINER.

-- Função geradora de badges
CREATE OR REPLACE FUNCTION public.gerar_badges_cuidar(
  p_user_id uuid,
  p_company_id uuid,
  p_campanha_id uuid,
  p_score_atual numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano int;
  v_semana int;
  v_score_anterior numeric;
  v_delta numeric;
  v_streak int := 0;
BEGIN
  IF p_score_atual IS NULL THEN
    RETURN;
  END IF;

  SELECT ano, semana_iso INTO v_ano, v_semana
  FROM public.pulse_campaigns WHERE id = p_campanha_id;

  -- Score da última campanha automática anterior do mesmo user (média de scores numéricos)
  SELECT ROUND(AVG(pr.score_numeric)::numeric, 2)
    INTO v_score_anterior
  FROM public.pulse_responses pr
  JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE c.user_id = p_user_id
    AND pc.origem IN ('auto_semanal','auto_mensal')
    AND pc.id <> p_campanha_id
    AND pr.score_numeric IS NOT NULL
    AND pr.created_at = (
      SELECT MAX(pr2.created_at)
      FROM public.pulse_responses pr2
      JOIN public.pulse_campaigns pc2 ON pc2.id = pr2.campaign_id
      JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
      WHERE c2.user_id = p_user_id
        AND pc2.origem IN ('auto_semanal','auto_mensal')
        AND pc2.id <> p_campanha_id
        AND pr2.score_numeric IS NOT NULL
    );

  SELECT COALESCE(streak_semanal, 0) INTO v_streak
  FROM public.cuidar_progressao WHERE user_id = p_user_id;

  -- Faixa de score
  IF p_score_atual >= 80 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'semana_leve', 'Semana Leve',
            'Você teve uma semana tranquila e equilibrada.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 60 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'semana_equilibrada', 'Semana Equilibrada',
            'Semana estável, com altos e baixos normais.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 40 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'semana_desafiadora', 'Semana Desafiadora',
            'Semana mais pesada — atenção ao autocuidado.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'atencao_bem_estar', 'Atenção ao Bem-Estar',
            'Sinal de alerta. Que tal pedir apoio?', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Evolução
  IF v_score_anterior IS NOT NULL THEN
    v_delta := p_score_atual - v_score_anterior;
    IF v_delta > 15 THEN
      INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'resiliencia', 'Resiliência',
              'Sua semana melhorou consideravelmente!', p_score_atual, v_ano, v_semana)
      ON CONFLICT DO NOTHING;
    ELSIF v_delta < -15 THEN
      INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'sinal_cansaco', 'Sinal de Cansaço',
              'Queda significativa em relação à semana anterior.', p_score_atual, v_ano, v_semana)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Consistência
  IF v_streak >= 4 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'constancia', 'Constância',
            '4 semanas respondendo. Que disciplina!', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_streak >= 12 THEN
    INSERT INTO public.cuidar_badges(user_id, company_id, campanha_id, badge_tipo, badge_label, badge_descricao, score, ano, semana_iso)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'ciclo_bem_estar', 'Ciclo de Bem-Estar',
            '12 semanas seguidas. Ciclo completo.', p_score_atual, v_ano, v_semana)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Agregação por semana para dashboard de RH
CREATE OR REPLACE FUNCTION public.agregar_badges_semana(
  p_company_id uuid,
  p_ano int,
  p_semana int
) RETURNS TABLE(
  badge_tipo text,
  badge_label text,
  total bigint,
  departamento text,
  total_por_depto bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT b.badge_tipo, b.badge_label, COALESCE(c.department, 'Sem departamento') AS departamento
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = p_ano
      AND b.semana_iso = p_semana
  )
  SELECT
    badge_tipo,
    badge_label,
    COUNT(*) OVER (PARTITION BY badge_tipo) AS total,
    departamento,
    COUNT(*) OVER (PARTITION BY badge_tipo, departamento) AS total_por_depto
  FROM base
  GROUP BY badge_tipo, badge_label, departamento;
$$;

-- Reescreve submit_pulse_campaign_response para também chamar gerar_badges_cuidar
DROP FUNCTION IF EXISTS public.submit_pulse_campaign_response(uuid, jsonb, text);

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
  v_score_medio NUMERIC(5,2);
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

  -- Onda 7.2: streak apenas para campanhas semanais automáticas
  IF v_origem = 'auto_semanal' AND v_data_inicio IS NOT NULL THEN
    PERFORM public.atualizar_streak_cuidar(v_user_id, v_company_id, v_data_inicio);
  END IF;

  -- Onda 7.3: gerar badges para campanhas automáticas (semanal e mensal)
  IF v_origem IN ('auto_semanal','auto_mensal') THEN
    SELECT ROUND(AVG(score_numeric)::numeric, 2) INTO v_score_medio
      FROM public.pulse_responses
     WHERE campaign_id = p_campaign_id
       AND employee_id = v_colaborador_id
       AND score_numeric IS NOT NULL;

    IF v_score_medio IS NOT NULL THEN
      PERFORM public.gerar_badges_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
    END IF;
  END IF;

  RETURN TRUE;
END;
$function$;
