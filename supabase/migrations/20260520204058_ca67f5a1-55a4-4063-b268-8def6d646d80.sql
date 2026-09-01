-- Onda 7.4: Recomendações inteligentes do Cuidar+

CREATE TABLE IF NOT EXISTS public.cuidar_recomendacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  campanha_id uuid REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  contexto text NOT NULL CHECK (contexto IN ('colaborador','gestor')),
  recomendacao text NOT NULL,
  tipo text NOT NULL,
  score numeric(5,2),
  ano int,
  semana_iso int,
  departamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campanha_id, tipo, contexto)
);

CREATE INDEX IF NOT EXISTS idx_cuidar_recomendacoes_company_semana
  ON public.cuidar_recomendacoes(company_id, ano, semana_iso);
CREATE INDEX IF NOT EXISTS idx_cuidar_recomendacoes_user_created
  ON public.cuidar_recomendacoes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cuidar_recomendacoes_contexto
  ON public.cuidar_recomendacoes(company_id, contexto, created_at DESC);

ALTER TABLE public.cuidar_recomendacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colaborador vê suas recomendações"
  ON public.cuidar_recomendacoes FOR SELECT
  USING (contexto = 'colaborador' AND user_id = auth.uid());

CREATE POLICY "Admin master lê tudo (recomendações)"
  ON public.cuidar_recomendacoes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Admin empresa/RH lê recomendações da empresa"
  ON public.cuidar_recomendacoes FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
  );

-- Sem INSERT/UPDATE/DELETE pelo cliente: só via RPC SECURITY DEFINER.

-- Função geradora de recomendações por colaborador
CREATE OR REPLACE FUNCTION public.gerar_recomendacoes_cuidar(
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
  v_depto text;
BEGIN
  IF p_score_atual IS NULL THEN RETURN; END IF;

  SELECT ano, semana_iso INTO v_ano, v_semana
  FROM public.pulse_campaigns WHERE id = p_campanha_id;

  SELECT COALESCE(department, 'Sem departamento') INTO v_depto
  FROM public.colaboradores WHERE user_id = p_user_id LIMIT 1;

  -- Score da última campanha automática anterior
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

  -- Recomendações por faixa de score (badge)
  IF p_score_atual >= 80 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Mantenha o que deu certo. Repita um hábito que funcionou esta semana.',
      'leve', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 60 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Continue ajustando pequenos pontos. Pergunte-se: o que posso simplificar?',
      'equilibrada', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  ELSIF p_score_atual >= 40 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Identifique um fator que drenou energia e reduza sua exposição a ele.',
      'desafiadora', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Considere ajustar a carga e conversar com seu líder se o padrão continuar.',
      'alerta', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Recomendações por tendência
  IF v_score_anterior IS NOT NULL THEN
    v_delta := p_score_atual - v_score_anterior;
    IF v_delta > 15 THEN
      INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
        'Anote o que funcionou essa semana — isso ajudará a manter o ritmo.',
        'tendencia_positiva', p_score_atual, v_ano, v_semana, v_depto)
      ON CONFLICT DO NOTHING;
    ELSIF v_delta < -15 THEN
      INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
        'Pausa programada: tire 15 minutos amanhã para recuperar foco.',
        'cansaco', p_score_atual, v_ano, v_semana, v_depto)
      ON CONFLICT DO NOTHING;
      INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
      VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
        'Perceba o gatilho da queda. O que mais impactou sua energia?',
        'tendencia_negativa', p_score_atual, v_ano, v_semana, v_depto)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Recomendações por streak
  IF v_streak >= 4 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Sua constância está ajudando a entender seu bem-estar.',
      'constancia', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_streak >= 12 THEN
    INSERT INTO public.cuidar_recomendacoes(user_id, company_id, campanha_id, contexto, recomendacao, tipo, score, ano, semana_iso, departamento)
    VALUES (p_user_id, p_company_id, p_campanha_id, 'colaborador',
      'Fechando um ciclo de consciência. Excelente consistência.',
      'ciclo', p_score_atual, v_ano, v_semana, v_depto)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Agregador organizacional para RH (gera recomendações de gestor da semana)
CREATE OR REPLACE FUNCTION public.agregar_recomendacoes_rh(
  p_company_id uuid,
  p_ano int,
  p_semana int
) RETURNS TABLE(
  departamento text,
  tipo text,
  recomendacao text,
  metric numeric,
  total_respondentes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_semana_anterior int;
  v_ano_anterior int;
BEGIN
  -- Semana anterior simples (mesmo ano)
  v_ano_anterior := p_ano;
  v_semana_anterior := p_semana - 1;
  IF v_semana_anterior <= 0 THEN
    v_ano_anterior := p_ano - 1;
    v_semana_anterior := 52;
  END IF;

  RETURN QUERY
  WITH atual AS (
    SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
           AVG(b.score) AS media,
           COUNT(DISTINCT b.user_id) AS respondentes
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = p_ano AND b.semana_iso = p_semana
      AND b.badge_tipo IN ('semana_leve','semana_equilibrada','semana_desafiadora','atencao_bem_estar')
    GROUP BY COALESCE(c.department, 'Sem departamento')
  ),
  anterior AS (
    SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
           AVG(b.score) AS media
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = v_ano_anterior AND b.semana_iso = v_semana_anterior
      AND b.badge_tipo IN ('semana_leve','semana_equilibrada','semana_desafiadora','atencao_bem_estar')
    GROUP BY COALESCE(c.department, 'Sem departamento')
  ),
  alertas AS (
    SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
           COUNT(*) FILTER (WHERE b.badge_tipo IN ('sinal_cansaco','atencao_bem_estar')) AS alta_carga
    FROM public.cuidar_badges b
    LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
    WHERE b.company_id = p_company_id
      AND b.ano = p_ano AND b.semana_iso = p_semana
    GROUP BY COALESCE(c.department, 'Sem departamento')
  )
  SELECT a.departamento,
         'humor_baixo'::text AS tipo,
         'Considere um check-in rápido com o time.'::text AS recomendacao,
         ROUND(a.media::numeric, 2) AS metric,
         a.respondentes
  FROM atual a
  WHERE a.media < 50
  UNION ALL
  SELECT a.departamento,
         'queda_coletiva'::text,
         'Revisar prioridades da semana pode ajudar o time a recuperar energia.'::text,
         ROUND((p.media - a.media)::numeric, 2),
         a.respondentes
  FROM atual a
  JOIN anterior p ON p.departamento = a.departamento
  WHERE (p.media - a.media) > 10
  UNION ALL
  SELECT al.departamento,
         'alta_carga'::text,
         'Avaliar redistribuição de tarefas e prazos.'::text,
         al.alta_carga::numeric,
         (SELECT respondentes FROM atual a2 WHERE a2.departamento = al.departamento)
  FROM alertas al
  WHERE al.alta_carga >= 3;
END;
$$;

-- Atualiza submit_pulse_campaign_response para chamar gerar_recomendacoes_cuidar
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

  IF v_origem = 'auto_semanal' AND v_data_inicio IS NOT NULL THEN
    PERFORM public.atualizar_streak_cuidar(v_user_id, v_company_id, v_data_inicio);
  END IF;

  IF v_origem IN ('auto_semanal','auto_mensal') THEN
    SELECT ROUND(AVG(score_numeric)::numeric, 2) INTO v_score_medio
      FROM public.pulse_responses
     WHERE campaign_id = p_campaign_id AND employee_id = v_colaborador_id
       AND score_numeric IS NOT NULL;

    IF v_score_medio IS NOT NULL THEN
      PERFORM public.gerar_badges_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
      -- Onda 7.4: recomendações inteligentes
      PERFORM public.gerar_recomendacoes_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
    END IF;
  END IF;

  RETURN TRUE;
END;
$function$;