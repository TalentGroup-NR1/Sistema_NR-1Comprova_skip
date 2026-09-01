
CREATE OR REPLACE FUNCTION public.gerar_alertas_coletivos_cuidar(
  p_company_id UUID, p_ano INT, p_semana INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_silencio_user RECORD;
  v_ano_anterior INT;
  v_semana_anterior INT;
BEGIN
  v_ano_anterior := p_ano;
  v_semana_anterior := p_semana - 1;
  IF v_semana_anterior < 1 THEN
    v_ano_anterior := p_ano - 1;
    v_semana_anterior := 52;
  END IF;

  FOR r IN
    WITH atual AS (
      SELECT COALESCE(c.department, 'Sem departamento') AS departamento,
             AVG(b.score) AS media,
             COUNT(DISTINCT b.user_id) AS respondentes,
             SUM(CASE WHEN b.badge_tipo IN ('semana_desafiadora','atencao_bem_estar') THEN 1 ELSE 0 END) AS alta_carga
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
    IF r.media_atual < 50 AND r.respondentes >= 3 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'moderado', 'coletivo',
        'humor_baixo_time', 'Queda de humor no time — revisar carga e prioridades.')
      ON CONFLICT DO NOTHING;
    END IF;

    IF r.media_anterior IS NOT NULL AND (r.media_anterior - r.media_atual) > 15 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'alto', 'coletivo',
        'queda_coletiva', 'Alerta coletivo — risco de sobrecarga na equipe.')
      ON CONFLICT DO NOTHING;
    END IF;

    IF r.alta_carga >= 3 THEN
      INSERT INTO public.cuidar_alertas(company_id, departamento, ano, semana_iso, severidade, tipo, gatilho, mensagem)
      VALUES (p_company_id, r.departamento, p_ano, p_semana, 'alto', 'coletivo',
        'alta_carga_time', 'Sinal de burnout — intervir em redistribuição imediata.')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  FOR v_silencio_user IN
    SELECT c.user_id, COALESCE(c.department, 'Sem departamento') AS departamento
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND c.status = 'ATIVO'
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
