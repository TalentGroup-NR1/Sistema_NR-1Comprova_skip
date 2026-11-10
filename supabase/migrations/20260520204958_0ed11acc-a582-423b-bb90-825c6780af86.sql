-- Onda 7.5: Alertas preventivos do Cuidar+

CREATE TABLE IF NOT EXISTS public.cuidar_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  departamento text,
  ano int,
  semana_iso int,
  severidade text NOT NULL CHECK (severidade IN ('baixo','moderado','alto')),
  tipo text NOT NULL CHECK (tipo IN ('individual','coletivo')),
  gatilho text NOT NULL,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_acao','resolvido','descartado')),
  acao_registrada text,
  acao_por uuid REFERENCES auth.users(id),
  acao_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_individual
  ON public.cuidar_alertas(user_id, ano, semana_iso, gatilho)
  WHERE tipo = 'individual' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_coletivo
  ON public.cuidar_alertas(company_id, departamento, ano, semana_iso, gatilho)
  WHERE tipo = 'coletivo';

CREATE INDEX IF NOT EXISTS idx_cuidar_alertas_company
  ON public.cuidar_alertas(company_id, status, severidade, created_at DESC);

ALTER TABLE public.cuidar_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master lê alertas"
  ON public.cuidar_alertas FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Admin empresa/RH lê alertas da empresa"
  ON public.cuidar_alertas FOR SELECT
  USING (
    company_id = public.get_my_company_id()
    AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
  );

CREATE POLICY "Admin master atualiza alertas"
  ON public.cuidar_alertas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Admin empresa/RH atualiza alertas da empresa"
  ON public.cuidar_alertas FOR UPDATE
  USING (
    company_id = public.get_my_company_id()
    AND (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
  );

-- INSERT/DELETE somente via RPC SECURITY DEFINER

-- =========================================================
-- Função: alertas individuais (chamada após cada resposta)
-- =========================================================
CREATE OR REPLACE FUNCTION public.gerar_alertas_individuais_cuidar(
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
  v_depto text;
  v_score_anterior numeric;
  v_delta numeric;
  v_count_baixos int;
BEGIN
  IF p_score_atual IS NULL THEN RETURN; END IF;

  SELECT ano, semana_iso INTO v_ano, v_semana
  FROM public.pulse_campaigns WHERE id = p_campanha_id;

  SELECT COALESCE(department, 'Sem departamento') INTO v_depto
  FROM public.colaboradores WHERE user_id = p_user_id LIMIT 1;

  -- score_critico: score < 30 → alto
  IF p_score_atual < 30 THEN
    INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
    VALUES (p_user_id, p_company_id, v_depto, v_ano, v_semana, 'alto', 'individual',
      'score_critico', 'Baixo bem-estar detectado — recomendado check-in individual.')
    ON CONFLICT DO NOTHING;
  END IF;

  -- queda_individual: delta < -20 vs última campanha auto
  SELECT ROUND(AVG(pr.score_numeric)::numeric, 2) INTO v_score_anterior
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

  IF v_score_anterior IS NOT NULL THEN
    v_delta := p_score_atual - v_score_anterior;
    IF v_delta < -20 THEN
      INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_user_id, p_company_id, v_depto, v_ano, v_semana, 'moderado', 'individual',
        'queda_individual', 'Variação significativa no humor — avaliar condições da semana.')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- padrao_recorrente: últimas 3 campanhas auto do user com score < 50
  SELECT COUNT(*) INTO v_count_baixos
  FROM (
    SELECT AVG(pr.score_numeric) AS media
    FROM public.pulse_responses pr
    JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
    JOIN public.colaboradores c ON c.id = pr.employee_id
    WHERE c.user_id = p_user_id
      AND pc.origem IN ('auto_semanal','auto_mensal')
      AND pr.score_numeric IS NOT NULL
    GROUP BY pr.campaign_id, pc.data_inicio
    ORDER BY pc.data_inicio DESC
    LIMIT 3
  ) ult
  WHERE ult.media < 50;

  IF v_count_baixos >= 3 THEN
    INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
    VALUES (p_user_id, p_company_id, v_depto, v_ano, v_semana, 'alto', 'individual',
      'padrao_recorrente', 'Padrão crítico recorrente — ação preventiva necessária.')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- =========================================================
-- Função: alertas coletivos + silêncio
-- =========================================================
CREATE OR REPLACE FUNCTION public.gerar_alertas_coletivos_cuidar(
  p_company_id uuid,
  p_ano int,
  p_semana int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano_anterior int := p_ano;
  v_semana_anterior int := p_semana - 1;
  r record;
  v_silencio_user record;
BEGIN
  IF v_semana_anterior <= 0 THEN
    v_ano_anterior := p_ano - 1;
    v_semana_anterior := 52;
  END IF;

  -- humor_baixo_time, queda_coletiva e alta_carga_time por departamento
  FOR r IN
    WITH atual AS (
      SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
             AVG(b.score) AS media,
             COUNT(DISTINCT b.user_id) AS respondentes,
             COUNT(*) FILTER (WHERE b.badge_tipo IN ('sinal_cansaco','atencao_bem_estar')) AS alta_carga
      FROM public.cuidar_badges b
      LEFT JOIN public.colaboradores c ON c.user_id = b.user_id
      WHERE b.company_id = p_company_id
        AND b.ano = p_ano AND b.semana_iso = p_semana
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
    )
    SELECT a.departamento,
           a.media AS media_atual,
           a.respondentes,
           a.alta_carga,
           p.media AS media_anterior
    FROM atual a
    LEFT JOIN anterior p ON p.departamento = a.departamento
  LOOP
    -- humor_baixo_time
    IF r.media_atual < 50 AND r.respondentes >= 3 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'moderado', 'coletivo',
        'humor_baixo_time', 'Queda de humor no time — revisar carga e prioridades.')
      ON CONFLICT DO NOTHING;
    END IF;

    -- queda_coletiva (delta > 15)
    IF r.media_anterior IS NOT NULL AND (r.media_anterior - r.media_atual) > 15 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'alto', 'coletivo',
        'queda_coletiva', 'Alerta coletivo — risco de sobrecarga na equipe.')
      ON CONFLICT DO NOTHING;
    END IF;

    -- alta_carga_time (3+ badges de cansaço/atenção)
    IF r.alta_carga >= 3 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'alto', 'coletivo',
        'alta_carga_time', 'Sinal de burnout — intervir em redistribuição imediata.')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- silencio: colaboradores ativos com histórico de respostas mas sem responder nas últimas 2 semanas
  FOR v_silencio_user IN
    SELECT c.user_id, COALESCE(c.department, 'Sem departamento') AS departamento
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.is_active = true
      AND c.user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.pulse_responses pr
        JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
        WHERE pr.employee_id = c.id
          AND pc.origem = 'auto_semanal'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.pulse_responses pr
        JOIN public.pulse_campaigns pc ON pc.id = pr.campaign_id
        WHERE pr.employee_id = c.id
          AND pc.origem = 'auto_semanal'
          AND pc.data_inicio >= (CURRENT_DATE - INTERVAL '14 days')
      )
  LOOP
    INSERT INTO public.cuidar_alertas(user_id, company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
    VALUES (v_silencio_user.user_id, p_company_id, v_silencio_user.departamento, p_ano, p_semana,
      'moderado', 'individual', 'silencio', 'Ausência de respostas — possível desengajamento.')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- =========================================================
-- Função: registrar ação no alerta
-- =========================================================
CREATE OR REPLACE FUNCTION public.registrar_acao_alerta(
  p_alerta_id uuid,
  p_acao text,
  p_novo_status text DEFAULT 'em_acao'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_role_ok boolean;
BEGIN
  IF p_novo_status NOT IN ('aberto','em_acao','resolvido','descartado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  SELECT company_id INTO v_company FROM public.cuidar_alertas WHERE id = p_alerta_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Alerta não encontrado';
  END IF;

  v_role_ok := public.has_role(auth.uid(), 'admin_master')
            OR ((public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh'))
                AND v_company = public.get_my_company_id());
  IF NOT v_role_ok THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.cuidar_alertas
     SET acao_registrada = p_acao,
         status = p_novo_status,
         acao_por = auth.uid(),
         acao_em = now()
   WHERE id = p_alerta_id;
END;
$$;

-- =========================================================
-- Reescreve submit_pulse_campaign_response (adiciona alertas)
-- =========================================================
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
      PERFORM public.gerar_recomendacoes_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
      -- Onda 7.5: alertas preventivos
      PERFORM public.gerar_alertas_individuais_cuidar(v_user_id, v_company_id, p_campaign_id, v_score_medio);
      IF v_ano IS NOT NULL AND v_semana IS NOT NULL THEN
        PERFORM public.gerar_alertas_coletivos_cuidar(v_company_id, v_ano, v_semana);
      END IF;
    END IF;
  END IF;

  RETURN TRUE;
END;
$function$;