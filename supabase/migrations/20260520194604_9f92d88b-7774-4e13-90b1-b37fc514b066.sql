
-- 1) Extend pulse_campaigns
ALTER TABLE public.pulse_campaigns
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS semana_iso INT,
  ADD COLUMN IF NOT EXISTS mes INT,
  ADD COLUMN IF NOT EXISTS ano INT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pulse_campaigns_auto_semanal
  ON public.pulse_campaigns(company_id, ano, semana_iso)
  WHERE origem = 'auto_semanal';

CREATE UNIQUE INDEX IF NOT EXISTS uq_pulse_campaigns_auto_mensal
  ON public.pulse_campaigns(company_id, ano, mes)
  WHERE origem = 'auto_mensal';

-- 2) Extend pulse_responses
ALTER TABLE public.pulse_responses
  ADD COLUMN IF NOT EXISTS score_numeric NUMERIC(5,2);

-- 3) cuidar_templates_fixos
CREATE TABLE IF NOT EXISTS public.cuidar_templates_fixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  perguntas_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cuidar_templates_fixos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read templates"
  ON public.cuidar_templates_fixos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin master manages templates"
  ON public.cuidar_templates_fixos FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin_master')
  WITH CHECK (public.get_my_role() = 'admin_master');

CREATE TRIGGER update_cuidar_templates_fixos_updated_at
  BEFORE UPDATE ON public.cuidar_templates_fixos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed templates
INSERT INTO public.cuidar_templates_fixos (template_key, nome, descricao, perguntas_json) VALUES
('pulso_rapido', 'Pulso Rápido', 'Pesquisa semanal com 1 pergunta', '[
  {"pergunta": "Como foi sua semana?", "tipo": "escala_0_5", "ordem": 1, "obrigatoria": true}
]'::jsonb),
('clima_basico', 'Clima Básico', 'Pesquisa de clima com 3 perguntas', '[
  {"pergunta": "Como está sua energia esta semana?", "tipo": "escala_0_5", "ordem": 1, "obrigatoria": true},
  {"pergunta": "Como está sua relação com o time?", "tipo": "escala_0_5", "ordem": 2, "obrigatoria": true},
  {"pergunta": "Como está sua carga de trabalho?", "tipo": "escala_0_5", "ordem": 3, "obrigatoria": true}
]'::jsonb),
('completo', 'Cuidar+ Completo', 'Pesquisa mensal completa com 5 perguntas', '[
  {"pergunta": "Como você avalia sua energia esta semana?", "tipo": "escala_0_5", "ordem": 1, "obrigatoria": true},
  {"pergunta": "Como está sua relação com o time?", "tipo": "escala_0_5", "ordem": 2, "obrigatoria": true},
  {"pergunta": "Como está sua carga de trabalho?", "tipo": "escala_0_5", "ordem": 3, "obrigatoria": true},
  {"pergunta": "Como você avalia sua motivação?", "tipo": "escala_0_5", "ordem": 4, "obrigatoria": true},
  {"pergunta": "Como está sua saúde mental?", "tipo": "escala_0_5", "ordem": 5, "obrigatoria": true}
]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- 4) cuidar_insights
CREATE TABLE IF NOT EXISTS public.cuidar_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  escopo TEXT NOT NULL CHECK (escopo IN ('semana','mes')),
  ano INT NOT NULL,
  semana_iso INT,
  mes INT,
  humor_medio NUMERIC(5,2),
  tendencia NUMERIC(5,2),
  total_respostas INT NOT NULL DEFAULT 0,
  alertas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, escopo, ano, semana_iso, mes)
);

CREATE INDEX IF NOT EXISTS idx_cuidar_insights_company_periodo
  ON public.cuidar_insights(company_id, escopo, ano, semana_iso, mes);

ALTER TABLE public.cuidar_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master views all insights"
  ON public.cuidar_insights FOR SELECT
  TO authenticated USING (public.get_my_role() = 'admin_master');

CREATE POLICY "Company admins view own insights"
  ON public.cuidar_insights FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('admin_empresa','analista_rh')
  );

-- 5) RPC: gerar campanhas do ano
CREATE OR REPLACE FUNCTION public.gerar_campanhas_cuidar_ano(p_company_id UUID, p_ano INT)
RETURNS TABLE(criadas_semanal INT, criadas_mensal INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_my_company UUID;
  v_data DATE;
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

  v_data := make_date(p_ano, 1, 1);
  -- avançar até primeira sexta-feira (ISO: Friday = 5)
  WHILE EXTRACT(ISODOW FROM v_data) <> 5 LOOP
    v_data := v_data + INTERVAL '1 day';
  END LOOP;

  WHILE EXTRACT(YEAR FROM v_data) = p_ano LOOP
    v_semana := EXTRACT(WEEK FROM v_data)::INT;
    v_mes := EXTRACT(MONTH FROM v_data)::INT;
    v_data_fim := v_data + INTERVAL '2 days'; -- sex -> dom
    -- última sexta do mês? (próxima sexta cai em outro mês)
    v_ultima_sexta_do_mes := EXTRACT(MONTH FROM (v_data + INTERVAL '7 days')) <> v_mes;

    -- pulso semanal
    BEGIN
      INSERT INTO public.pulse_campaigns(
        company_id, titulo, descricao, ativo, data_inicio, data_fim,
        tipo, origem, template_key, semana_iso, mes, ano
      ) VALUES (
        p_company_id,
        'Pulso da Semana ' || v_semana,
        'Pergunta semanal automática do Cuidar+',
        false,
        v_data, v_data_fim,
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
      -- já existe, ignora
      NULL;
    END;

    -- mensal (última sexta do mês) — campanha completa em janela 5 dias
    IF v_ultima_sexta_do_mes THEN
      BEGIN
        INSERT INTO public.pulse_campaigns(
          company_id, titulo, descricao, ativo, data_inicio, data_fim,
          tipo, origem, template_key, semana_iso, mes, ano
        ) VALUES (
          p_company_id,
          'Cuidar+ Mensal ' || to_char(v_data, 'MM/YYYY'),
          'Pesquisa mensal completa do Cuidar+',
          false,
          v_data, v_data + INTERVAL '4 days',
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
    END IF;

    v_data := v_data + INTERVAL '7 days';
  END LOOP;

  criadas_semanal := v_count_sem;
  criadas_mensal := v_count_men;
  RETURN NEXT;
END;
$$;

-- 6) RPC: recalcular insights (semana ou mes)
CREATE OR REPLACE FUNCTION public.recalcular_insights_cuidar(
  p_company_id UUID, p_escopo TEXT, p_ano INT, p_semana INT DEFAULT NULL, p_mes INT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_humor NUMERIC(5,2);
  v_humor_ant NUMERIC(5,2);
  v_tend NUMERIC(5,2);
  v_total INT;
  v_alertas JSONB := '[]'::jsonb;
  v_id UUID;
  v_individual JSONB;
  v_total_colab INT;
  v_participacao NUMERIC;
BEGIN
  IF p_escopo NOT IN ('semana','mes') THEN
    RAISE EXCEPTION 'escopo inválido';
  END IF;

  IF p_escopo = 'semana' THEN
    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2), COUNT(*)
      INTO v_humor, v_total
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.ano = p_ano AND pc.semana_iso = p_semana
      AND pc.origem = 'auto_semanal'
      AND pr.score_numeric IS NOT NULL;

    -- semana anterior
    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2) INTO v_humor_ant
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.origem = 'auto_semanal'
      AND ((pc.ano = p_ano AND pc.semana_iso = p_semana - 1)
        OR (p_semana = 1 AND pc.ano = p_ano - 1 AND pc.semana_iso = 52))
      AND pr.score_numeric IS NOT NULL;
  ELSE
    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2), COUNT(*)
      INTO v_humor, v_total
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.ano = p_ano AND pc.mes = p_mes
      AND pc.origem = 'auto_mensal'
      AND pr.score_numeric IS NOT NULL;

    SELECT ROUND(AVG(pr.score_numeric)::NUMERIC, 2) INTO v_humor_ant
    FROM pulse_responses pr
    JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
    WHERE pc.company_id = p_company_id
      AND pc.origem = 'auto_mensal'
      AND ((pc.ano = p_ano AND pc.mes = p_mes - 1)
        OR (p_mes = 1 AND pc.ano = p_ano - 1 AND pc.mes = 12))
      AND pr.score_numeric IS NOT NULL;
  END IF;

  v_tend := COALESCE(v_humor, 0) - COALESCE(v_humor_ant, 0);

  -- Alertas individuais: último score < 30
  IF p_escopo = 'semana' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'tipo','individual',
      'employee_id', x.employee_id,
      'score', x.media_score
    )), '[]'::jsonb)
    INTO v_individual
    FROM (
      SELECT pr.employee_id, ROUND(AVG(pr.score_numeric)::NUMERIC,2) AS media_score
      FROM pulse_responses pr
      JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
      WHERE pc.company_id = p_company_id
        AND pc.ano = p_ano AND pc.semana_iso = p_semana
        AND pc.origem = 'auto_semanal'
        AND pr.score_numeric IS NOT NULL
      GROUP BY pr.employee_id
      HAVING AVG(pr.score_numeric) < 30
    ) x;
    v_alertas := v_alertas || v_individual;

    -- participação
    SELECT COUNT(*) INTO v_total_colab FROM colaboradores
      WHERE company_id = p_company_id AND status = 'ATIVO';
    IF v_total_colab > 0 THEN
      v_participacao := (
        SELECT COUNT(DISTINCT pr.employee_id)::NUMERIC / v_total_colab
        FROM pulse_responses pr
        JOIN pulse_campaigns pc ON pc.id = pr.campaign_id
        WHERE pc.company_id = p_company_id
          AND pc.ano = p_ano AND pc.semana_iso = p_semana
          AND pc.origem = 'auto_semanal'
      );
      IF v_participacao < 0.3 THEN
        v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
          'tipo','participacao_baixa',
          'taxa', ROUND(v_participacao*100, 1)
        ));
      END IF;
    END IF;
  END IF;

  -- Queda de grupo
  IF v_humor IS NOT NULL AND v_humor_ant IS NOT NULL AND (v_humor_ant - v_humor) > 15 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'tipo','queda_grupo',
      'delta', v_tend
    ));
  END IF;

  INSERT INTO cuidar_insights(company_id, escopo, ano, semana_iso, mes,
    humor_medio, tendencia, total_respostas, alertas_json, calculado_em)
  VALUES (p_company_id, p_escopo, p_ano, p_semana, p_mes,
    v_humor, v_tend, COALESCE(v_total,0), v_alertas, now())
  ON CONFLICT (company_id, escopo, ano, semana_iso, mes)
  DO UPDATE SET
    humor_medio = EXCLUDED.humor_medio,
    tendencia = EXCLUDED.tendencia,
    total_respostas = EXCLUDED.total_respostas,
    alertas_json = EXCLUDED.alertas_json,
    calculado_em = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
