
-- 1. Categoria em tipos de abono
ALTER TABLE public.ponto_tipos_abono
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'outros'
  CHECK (categoria IN ('falta_injustificada','atestado_medico','atraso','saida_antecipada','folga','ferias','outros'));

UPDATE public.ponto_tipos_abono SET categoria = CASE
  WHEN codigo ILIKE '%ATESTADO%' OR nome ILIKE '%atestado%' THEN 'atestado_medico'
  WHEN codigo ILIKE '%FERIAS%' OR nome ILIKE '%f_rias%' THEN 'ferias'
  WHEN codigo IN ('FOLGA','DAY_OFF','EMENDA_FERIADO') OR nome ILIKE '%folga%' OR nome ILIKE '%day off%' OR nome ILIKE '%emenda%' THEN 'folga'
  WHEN codigo ILIKE '%FALTA%' OR nome ILIKE '%falta%injust%' THEN 'falta_injustificada'
  WHEN codigo ILIKE '%ATRASO%' OR nome ILIKE '%atraso%' THEN 'atraso'
  WHEN codigo ILIKE '%SAIDA_ANTEC%' OR nome ILIKE '%sa_da antecipada%' THEN 'saida_antecipada'
  ELSE 'outros'
END
WHERE categoria = 'outros';

-- 2. Divisor dinâmico por colaborador
CREATE OR REPLACE FUNCTION public.calc_horas_mensais_colab(p_colab uuid)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_dias int; v_carga int; v_semanais numeric; v_mensais numeric;
BEGIN
  SELECT array_length(ws.dias_semana,1), ws.carga_diaria_minutos
    INTO v_dias, v_carga
  FROM public.colaboradores c
  JOIN public.work_schedules ws ON ws.id = c.work_schedule_id
  WHERE c.id = p_colab;
  IF v_dias IS NULL OR v_carga IS NULL OR v_carga = 0 THEN
    RETURN 220;
  END IF;
  v_semanais := (v_carga::numeric / 60) * v_dias;
  v_mensais := round(v_semanais * 4.333 / 10) * 10;
  IF v_mensais < 80 THEN v_mensais := 220; END IF;
  RETURN v_mensais;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calc_horas_mensais_colab(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calc_horas_mensais_colab(uuid) TO authenticated;

-- 3. Helper autorização: admin OU gestor
CREATE OR REPLACE FUNCTION public._relatorios_ponto_scope()
RETURNS TABLE (is_admin boolean, my_colab_id uuid, my_company_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;
  is_admin := has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_empresa') OR has_role(auth.uid(),'analista_rh');
  IF is_admin THEN
    my_colab_id := NULL;
    my_company_id := get_my_company_id();
    RETURN NEXT;
    RETURN;
  END IF;
  IF has_role(auth.uid(),'gestor_departamento') THEN
    SELECT id, company_id INTO my_colab_id, my_company_id FROM colaboradores WHERE user_id = auth.uid() LIMIT 1;
    is_admin := false;
    RETURN NEXT;
    RETURN;
  END IF;
  RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
END;
$$;
REVOKE EXECUTE ON FUNCTION public._relatorios_ponto_scope() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._relatorios_ponto_scope() TO authenticated;

-- 4. RPC principal absenteísmo
CREATE OR REPLACE FUNCTION public.get_relatorio_absenteismo_v1(
  p_company_id uuid,
  p_data_inicio date,
  p_data_fim date,
  p_departamento text DEFAULT NULL,
  p_empresa_cliente text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_scope record;
  v_result jsonb;
  v_dias_periodo int;
  v_data_ini_ant date;
  v_data_fim_ant date;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();

  v_dias_periodo := (p_data_fim - p_data_inicio) + 1;
  v_data_ini_ant := p_data_inicio - v_dias_periodo;
  v_data_fim_ant := p_data_inicio - 1;

  -- CTE: colaboradores no escopo
  WITH colabs AS (
    SELECT c.id, c.full_name, c.department, c.empresa_cliente, c.base_salary,
           c.work_schedule_id, c.company_id,
           public.calc_horas_mensais_colab(c.id) AS horas_mensais,
           (c.base_salary / NULLIF(public.calc_horas_mensais_colab(c.id),0)) AS valor_hora
    FROM colaboradores c
    WHERE c.status = 'ativo'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (v_scope.is_admin OR c.company_id = v_scope.my_company_id OR v_scope.my_company_id IS NULL)
      AND (p_departamento IS NULL OR c.department = p_departamento)
      AND (p_empresa_cliente IS NULL OR c.empresa_cliente = p_empresa_cliente)
      AND (NOT v_scope.is_admin OR get_my_role() = 'admin_master' OR c.company_id = get_my_company_id())
  ),
  -- Resumo por colaborador no período (usa ponto_resumo_diario)
  resumo_periodo AS (
    SELECT r.colaborador_id,
           SUM(r.horas_previstas_minutos) AS prev_min,
           SUM(r.horas_trabalhadas_minutos) AS trab_min,
           SUM(r.horas_extras_minutos) AS extras_min,
           SUM(CASE WHEN r.horas_previstas_minutos > 0 AND r.horas_trabalhadas_minutos = 0
                        AND NOT EXISTS (
                          SELECT 1 FROM ponto_abonos a
                          JOIN ponto_tipos_abono t ON t.id = a.tipo_abono_id
                          WHERE a.colaborador_id = r.colaborador_id
                            AND a.status = 'ativo'
                            AND r.data BETWEEN a.data_inicio AND a.data_fim
                        )
                   THEN r.horas_previstas_minutos ELSE 0 END) AS falta_implicita_min,
           SUM(CASE WHEN r.horas_previstas_minutos > 0 AND r.horas_trabalhadas_minutos = 0
                        AND NOT EXISTS (
                          SELECT 1 FROM ponto_abonos a
                          WHERE a.colaborador_id = r.colaborador_id
                            AND a.status = 'ativo'
                            AND r.data BETWEEN a.data_inicio AND a.data_fim
                        )
                   THEN 1 ELSE 0 END) AS dias_falta_implicita
    FROM ponto_resumo_diario r
    WHERE r.data BETWEEN p_data_inicio AND p_data_fim
      AND r.colaborador_id IN (SELECT id FROM colabs)
    GROUP BY r.colaborador_id
  ),
  -- Abonos por colaborador e categoria
  abonos_cat AS (
    SELECT a.colaborador_id, t.categoria,
           SUM(CASE
             WHEN a.modalidade = 'horas' THEN a.minutos_abonados
             ELSE (LEAST(a.data_fim, p_data_fim) - GREATEST(a.data_inicio, p_data_inicio) + 1) * 480
           END) AS min_abonados
    FROM ponto_abonos a
    JOIN ponto_tipos_abono t ON t.id = a.tipo_abono_id
    WHERE a.status = 'ativo'
      AND a.colaborador_id IN (SELECT id FROM colabs)
      AND a.data_inicio <= p_data_fim AND a.data_fim >= p_data_inicio
    GROUP BY a.colaborador_id, t.categoria
  ),
  -- Horas perdidas abonadas (falta_injustificada, atraso, saida_antecipada)
  perdidas_abonadas AS (
    SELECT colaborador_id, SUM(min_abonados) AS min_perdidas_abonadas
    FROM abonos_cat
    WHERE categoria IN ('falta_injustificada','atraso','saida_antecipada')
    GROUP BY colaborador_id
  ),
  -- Consolidado por colaborador
  colab_final AS (
    SELECT c.*,
           COALESCE(rp.prev_min,0) AS prev_min,
           COALESCE(rp.trab_min,0) AS trab_min,
           COALESCE(rp.extras_min,0) AS extras_min,
           COALESCE(rp.falta_implicita_min,0) AS falta_implicita_min,
           COALESCE(rp.dias_falta_implicita,0) AS dias_falta_implicita,
           COALESCE(pa.min_perdidas_abonadas,0) AS min_perdidas_abonadas,
           COALESCE(rp.falta_implicita_min,0) + COALESCE(pa.min_perdidas_abonadas,0) AS perdidas_min
    FROM colabs c
    LEFT JOIN resumo_periodo rp ON rp.colaborador_id = c.id
    LEFT JOIN perdidas_abonadas pa ON pa.colaborador_id = c.id
  ),
  -- Período anterior (para tendência)
  resumo_anterior AS (
    SELECT SUM(horas_previstas_minutos) AS prev_min,
           SUM(CASE WHEN horas_previstas_minutos>0 AND horas_trabalhadas_minutos=0 THEN horas_previstas_minutos ELSE 0 END) AS perdidas_min,
           SUM(horas_extras_minutos) AS extras_min
    FROM ponto_resumo_diario
    WHERE data BETWEEN v_data_ini_ant AND v_data_fim_ant
      AND colaborador_id IN (SELECT id FROM colabs)
  ),
  -- Série mensal (últimos 12 meses cobrindo o período)
  serie_mensal AS (
    SELECT date_trunc('month', r.data)::date AS mes,
           SUM(r.horas_previstas_minutos) AS prev_min,
           SUM(CASE WHEN r.horas_previstas_minutos>0 AND r.horas_trabalhadas_minutos=0 THEN r.horas_previstas_minutos ELSE 0 END) AS perdidas_min,
           SUM(r.horas_extras_minutos) AS extras_min
    FROM ponto_resumo_diario r
    WHERE r.data BETWEEN (p_data_inicio - INTERVAL '11 months')::date AND p_data_fim
      AND r.colaborador_id IN (SELECT id FROM colabs)
    GROUP BY 1
    ORDER BY 1
  ),
  -- Ranking dept
  ranking_dept AS (
    SELECT COALESCE(cf.department,'Sem departamento') AS departamento,
           COUNT(*) AS colabs,
           SUM(cf.perdidas_min) AS perdidas_min,
           SUM(cf.prev_min) AS prev_min,
           CASE WHEN SUM(cf.prev_min)>0
                THEN ROUND((SUM(cf.perdidas_min)::numeric / SUM(cf.prev_min)) * 100, 2)
                ELSE 0 END AS ia_pct
    FROM colab_final cf
    GROUP BY 1
    ORDER BY ia_pct DESC
    LIMIT 10
  ),
  -- Breakdown categorias (inclui falta implícita como pseudo-categoria)
  breakdown AS (
    SELECT 'falta_implicita' AS categoria, SUM(falta_implicita_min) AS minutos FROM colab_final
    UNION ALL
    SELECT categoria, SUM(min_abonados) FROM abonos_cat GROUP BY categoria
  ),
  -- Detalhado
  detalhado AS (
    SELECT cf.id, cf.full_name, cf.department, cf.empresa_cliente,
           cf.horas_mensais, cf.valor_hora, cf.base_salary,
           cf.prev_min, cf.trab_min, cf.extras_min,
           cf.falta_implicita_min, cf.min_perdidas_abonadas, cf.perdidas_min,
           cf.dias_falta_implicita,
           CASE WHEN cf.prev_min>0 THEN ROUND((cf.perdidas_min::numeric/cf.prev_min)*100, 2) ELSE 0 END AS ia_pct,
           CASE WHEN cf.valor_hora IS NOT NULL THEN ROUND(cf.valor_hora * (cf.perdidas_min::numeric/60), 2) ELSE NULL END AS custo_absent,
           CASE WHEN cf.valor_hora IS NOT NULL THEN ROUND(cf.valor_hora * 1.5 * (cf.extras_min::numeric/60), 2) ELSE NULL END AS custo_extras
    FROM colab_final cf
    ORDER BY ia_pct DESC
  ),
  -- Atrasos: 1ª ENTRADA do dia vs previsto
  atrasos AS (
    SELECT p.colaborador_id, p.data,
           EXTRACT(EPOCH FROM (p.primeira_entrada - (p.data + ws.entrada_manha)::timestamp))/60 AS min_atraso
    FROM (
      SELECT colaborador_id, (data_hora AT TIME ZONE 'America/Sao_Paulo')::date AS data,
             MIN(data_hora AT TIME ZONE 'America/Sao_Paulo') AS primeira_entrada
      FROM ponto_registros
      WHERE tipo='ENTRADA' AND status_aprovacao='aprovado'
        AND colaborador_id IN (SELECT id FROM colabs)
        AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_data_inicio AND p_data_fim
      GROUP BY 1,2
    ) p
    JOIN colaboradores c ON c.id = p.colaborador_id
    LEFT JOIN work_schedules ws ON ws.id = c.work_schedule_id
    WHERE ws.entrada_manha IS NOT NULL
      AND p.primeira_entrada > ((p.data + ws.entrada_manha)::timestamp + (COALESCE(ws.tolerancia_minutos,10) || ' minutes')::interval)
  ),
  atrasos_agg AS (
    SELECT COUNT(DISTINCT colaborador_id) AS colabs_atraso, COALESCE(SUM(min_atraso),0)::int AS min_atraso_total FROM atrasos
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_data_inicio, 'fim', p_data_fim),
    'kpis', jsonb_build_object(
      'ia_pct', CASE WHEN (SELECT SUM(prev_min) FROM colab_final)>0
                     THEN ROUND((SELECT SUM(perdidas_min) FROM colab_final)::numeric / (SELECT SUM(prev_min) FROM colab_final) * 100, 2)
                     ELSE 0 END,
      'ia_pct_anterior', CASE WHEN (SELECT prev_min FROM resumo_anterior)>0
                              THEN ROUND((SELECT perdidas_min FROM resumo_anterior)::numeric / (SELECT prev_min FROM resumo_anterior) * 100, 2)
                              ELSE 0 END,
      'horas_extras_min', COALESCE((SELECT SUM(extras_min) FROM colab_final),0),
      'horas_extras_min_anterior', COALESCE((SELECT extras_min FROM resumo_anterior),0),
      'atrasos_min', (SELECT min_atraso_total FROM atrasos_agg),
      'atrasos_colabs', (SELECT colabs_atraso FROM atrasos_agg),
      'custo_absenteismo', COALESCE((SELECT SUM(custo_absent) FROM detalhado),0),
      'custo_horas_extras', COALESCE((SELECT SUM(custo_extras) FROM detalhado),0),
      'divisor_medio', COALESCE((SELECT ROUND(AVG(horas_mensais),0) FROM colab_final),220),
      'colabs_sem_salario', (SELECT COUNT(*) FROM colab_final WHERE base_salary IS NULL OR base_salary=0),
      'total_colabs', (SELECT COUNT(*) FROM colab_final)
    ),
    'serie_mensal', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'mes', to_char(mes,'YYYY-MM'),
        'ia_pct', CASE WHEN prev_min>0 THEN ROUND(perdidas_min::numeric/prev_min*100,2) ELSE 0 END,
        'extras_min', COALESCE(extras_min,0)
      ) ORDER BY mes) FROM serie_mensal),'[]'::jsonb),
    'breakdown_categorias', COALESCE((SELECT jsonb_agg(jsonb_build_object('categoria', categoria, 'minutos', COALESCE(minutos,0)))
                                       FROM breakdown WHERE COALESCE(minutos,0)>0),'[]'::jsonb),
    'ranking_departamentos', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'departamento', departamento, 'colabs', colabs, 'ia_pct', ia_pct,
        'perdidas_min', perdidas_min, 'prev_min', prev_min
      )) FROM ranking_dept),'[]'::jsonb),
    'detalhado', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'colaborador_id', id, 'nome', full_name, 'departamento', department, 'empresa_cliente', empresa_cliente,
        'horas_mensais', horas_mensais, 'valor_hora', valor_hora, 'base_salary', base_salary,
        'prev_min', prev_min, 'trab_min', trab_min, 'extras_min', extras_min,
        'falta_implicita_min', falta_implicita_min, 'perdidas_abonadas_min', min_perdidas_abonadas,
        'perdidas_min', perdidas_min, 'dias_falta_implicita', dias_falta_implicita,
        'ia_pct', ia_pct, 'custo_absent', custo_absent, 'custo_extras', custo_extras
      )) FROM detalhado),'[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_relatorio_absenteismo_v1(uuid,date,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_relatorio_absenteismo_v1(uuid,date,date,text,text) TO authenticated;

-- 5. Jornada — série mensal
CREATE OR REPLACE FUNCTION public.get_relatorio_jornada_v1(
  p_company_id uuid, p_data_inicio date, p_data_fim date,
  p_departamento text DEFAULT NULL, p_empresa_cliente text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_scope record; v_result jsonb;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();
  WITH colabs AS (
    SELECT c.id FROM colaboradores c
    WHERE c.status='ativo'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (p_departamento IS NULL OR c.department = p_departamento)
      AND (p_empresa_cliente IS NULL OR c.empresa_cliente = p_empresa_cliente)
      AND (NOT v_scope.is_admin OR get_my_role()='admin_master' OR c.company_id = get_my_company_id())
  ),
  mensal AS (
    SELECT date_trunc('month', data)::date AS mes,
           SUM(horas_trabalhadas_minutos - horas_extras_minutos) AS normais_min,
           SUM(horas_extras_minutos) AS extras_min,
           SUM(GREATEST(horas_previstas_minutos - horas_trabalhadas_minutos, 0)) AS faltantes_min,
           SUM(saldo_minutos) AS saldo_min
    FROM ponto_resumo_diario
    WHERE data BETWEEN p_data_inicio AND p_data_fim
      AND colaborador_id IN (SELECT id FROM colabs)
    GROUP BY 1 ORDER BY 1
  )
  SELECT jsonb_build_object(
    'serie_mensal', COALESCE(jsonb_agg(jsonb_build_object(
      'mes', to_char(mes,'YYYY-MM'),
      'normais_min', COALESCE(normais_min,0),
      'extras_min', COALESCE(extras_min,0),
      'faltantes_min', COALESCE(faltantes_min,0),
      'saldo_min', COALESCE(saldo_min,0)
    ) ORDER BY mes),'[]'::jsonb)
  ) INTO v_result FROM mensal;
  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_relatorio_jornada_v1(uuid,date,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_relatorio_jornada_v1(uuid,date,date,text,text) TO authenticated;

-- 6. Alertas NR1
CREATE OR REPLACE FUNCTION public.get_alertas_nr1_v1(
  p_company_id uuid, p_data_inicio date, p_data_fim date
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_scope record; v_result jsonb;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();
  WITH colabs AS (
    SELECT c.id, c.full_name, c.department, c.gestor_id FROM colaboradores c
    WHERE c.status='ativo'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (NOT v_scope.is_admin OR get_my_role()='admin_master' OR c.company_id = get_my_company_id())
  ),
  -- Faltas implícitas por colab/mês
  faltas_mes AS (
    SELECT r.colaborador_id, date_trunc('month', r.data)::date AS mes, COUNT(*) AS qtd
    FROM ponto_resumo_diario r
    WHERE r.data BETWEEN p_data_inicio AND p_data_fim
      AND r.colaborador_id IN (SELECT id FROM colabs)
      AND r.horas_previstas_minutos > 0 AND r.horas_trabalhadas_minutos = 0
      AND NOT EXISTS (SELECT 1 FROM ponto_abonos a WHERE a.colaborador_id=r.colaborador_id AND a.status='ativo' AND r.data BETWEEN a.data_inicio AND a.data_fim)
    GROUP BY 1,2 HAVING COUNT(*) > 3
  ),
  atestados AS (
    SELECT a.colaborador_id, COUNT(*) AS qtd
    FROM ponto_abonos a JOIN ponto_tipos_abono t ON t.id=a.tipo_abono_id
    WHERE t.categoria='atestado_medico' AND a.status='ativo'
      AND a.data_inicio BETWEEN p_data_inicio AND p_data_fim
      AND a.colaborador_id IN (SELECT id FROM colabs)
    GROUP BY 1 HAVING COUNT(*) > 5
  )
  SELECT jsonb_build_object(
    'faltas_recorrentes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'colaborador_id', c.id, 'nome', c.full_name, 'departamento', c.department,
      'mes', to_char(f.mes,'YYYY-MM'), 'qtd_faltas', f.qtd
    )) FROM faltas_mes f JOIN colabs c ON c.id=f.colaborador_id),'[]'::jsonb),
    'atestados_frequentes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'colaborador_id', c.id, 'nome', c.full_name, 'departamento', c.department, 'qtd_atestados', a.qtd
    )) FROM atestados a JOIN colabs c ON c.id=a.colaborador_id),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_alertas_nr1_v1(uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_alertas_nr1_v1(uuid,date,date) TO authenticated;
