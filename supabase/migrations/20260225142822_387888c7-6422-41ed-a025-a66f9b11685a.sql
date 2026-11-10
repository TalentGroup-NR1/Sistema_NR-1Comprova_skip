
CREATE OR REPLACE FUNCTION public.get_executive_report_data(p_company_id uuid, p_year integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_headcount JSON;
  v_admissoes_mes JSON;
  v_desligamentos_mes JSON;
  v_departamentos JSON;
  v_gestao_tecnica JSON;
  v_feedback JSON;
  v_avaliacoes JSON;
  v_pdis JSON;
  v_treinamentos JSON;
  v_promocoes JSON;
  v_demografia_sexo JSON;
  v_demografia_raca JSON;
  v_faixas_etarias JSON;
  v_geografia JSON;
  v_tempo_casa JSON;
  v_cargos_niveis JSON;
  v_escolaridade JSON;
  v_promocoes_detalhadas JSON;
  v_role app_role;
BEGIN
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 1. Headcount
  SELECT json_build_object(
    'ativos', COALESCE(SUM(CASE WHEN status = 'ATIVO' THEN 1 ELSE 0 END), 0),
    'desligados', COALESCE(SUM(CASE WHEN status = 'DESLIGADO' THEN 1 ELSE 0 END), 0),
    'ferias', COALESCE(SUM(CASE WHEN status = 'FERIAS' THEN 1 ELSE 0 END), 0),
    'licenca', COALESCE(SUM(CASE WHEN status = 'LICENCA' THEN 1 ELSE 0 END), 0),
    'total', COUNT(*)
  ) INTO v_headcount
  FROM colaboradores WHERE company_id = p_company_id;

  -- 2. Admissoes por mes
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_admissoes_mes
  FROM (
    SELECT EXTRACT(MONTH FROM admission_date)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND EXTRACT(YEAR FROM admission_date) = p_year
    GROUP BY mes ORDER BY mes
  ) t;

  -- 3. Desligamentos por mes (FIXED: use 'desligar' instead of 'DESLIGAMENTO')
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_desligamentos_mes
  FROM (
    SELECT EXTRACT(MONTH FROM dc.data_desligamento)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM desligamentos_colaborador dc
    JOIN colaboradores c ON c.id = dc.colaborador_id
    WHERE c.company_id = p_company_id 
      AND EXTRACT(YEAR FROM dc.data_desligamento) = p_year
      AND dc.acao = 'desligar'
    GROUP BY mes ORDER BY mes
  ) t;

  -- 4. Departamentos
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_departamentos
  FROM (
    SELECT department as departamento, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY department ORDER BY total DESC
  ) t;

  -- 5. Gestao Tecnica
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_gestao_tecnica
  FROM (
    SELECT COALESCE(NULLIF(gestao_tecnica, ''), 'Sem Gestão Técnica') as gestor, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY gestor ORDER BY total DESC
  ) t;

  -- 6. Demografia Sexo
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_demografia_sexo
  FROM (
    SELECT COALESCE(sex::TEXT, 'Não informado') as sexo, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY sexo ORDER BY total DESC
  ) t;

  -- 7. Demografia Raca
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_demografia_raca
  FROM (
    SELECT COALESCE(ethnicity::TEXT, 'Não informado') as raca, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY raca ORDER BY total DESC
  ) t;

  -- 8. Faixas Etarias
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_faixas_etarias
  FROM (
    SELECT 
      CASE 
        WHEN EXTRACT(YEAR FROM age(birth_date::date)) BETWEEN 18 AND 25 THEN '18-25'
        WHEN EXTRACT(YEAR FROM age(birth_date::date)) BETWEEN 26 AND 35 THEN '26-35'
        WHEN EXTRACT(YEAR FROM age(birth_date::date)) BETWEEN 36 AND 45 THEN '36-45'
        WHEN EXTRACT(YEAR FROM age(birth_date::date)) > 45 THEN '46+'
        ELSE 'N/A'
      END as faixa,
      COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY faixa ORDER BY faixa
  ) t;

  -- 9. Geografia
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_geografia
  FROM (
    SELECT COALESCE(NULLIF(address_state, ''), 'Não informado') as estado, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY estado ORDER BY total DESC
    LIMIT 10
  ) t;

  -- 10. Tempo de Casa
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_tempo_casa
  FROM (
    SELECT 
      CASE 
        WHEN EXTRACT(YEAR FROM age(admission_date::date)) < 1 THEN '< 1 ano'
        WHEN EXTRACT(YEAR FROM age(admission_date::date)) BETWEEN 1 AND 2 THEN '1-3 anos'
        WHEN EXTRACT(YEAR FROM age(admission_date::date)) BETWEEN 3 AND 4 THEN '3-5 anos'
        ELSE '5+ anos'
      END as faixa,
      COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY faixa ORDER BY faixa
  ) t;

  -- 11. Cargos e Niveis
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_cargos_niveis
  FROM (
    SELECT job_title as cargo, COALESCE(job_level::TEXT, 'N/A') as nivel, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY job_title, job_level ORDER BY total DESC
    LIMIT 15
  ) t;

  -- 12. Escolaridade
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_escolaridade
  FROM (
    SELECT COALESCE(education_level::TEXT, 'Não informado') as nivel, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY nivel ORDER BY total DESC
  ) t;

  -- 13. Feedback cycles
  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0),
    'concluidos', COALESCE(SUM(CASE WHEN status = 'CONCLUIDO' THEN 1 ELSE 0 END), 0),
    'por_milestone', COALESCE(
      (SELECT json_agg(row_to_json(m)) FROM (
        SELECT milestone_type, COUNT(*)::INTEGER as total
        FROM feedback_cycles
        WHERE company_id = p_company_id AND EXTRACT(YEAR FROM created_at) = p_year
        GROUP BY milestone_type
      ) m),
      '[]'::json
    )
  ) INTO v_feedback
  FROM feedback_cycles
  WHERE company_id = p_company_id AND EXTRACT(YEAR FROM created_at) = p_year;

  -- 14. Avaliacoes
  SELECT json_build_object(
    'ciclos_total', COALESCE((
      SELECT COUNT(*) FROM ciclos_avaliacao 
      WHERE company_id = p_company_id AND EXTRACT(YEAR FROM data_inicio) = p_year
    ), 0),
    'avaliacoes_total', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      WHERE ca.company_id = p_company_id AND EXTRACT(YEAR FROM ca.data_inicio) = p_year
    ), 0),
    'autoavaliacoes_concluidas', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      WHERE ca.company_id = p_company_id AND EXTRACT(YEAR FROM ca.data_inicio) = p_year
        AND a.status_autoavaliacao = 'concluida'
    ), 0),
    'avaliacoes_gestor_concluidas', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      WHERE ca.company_id = p_company_id AND EXTRACT(YEAR FROM ca.data_inicio) = p_year
        AND a.status_avaliacao_gestor = 'concluida'
    ), 0)
  ) INTO v_avaliacoes;

  -- 15. PDIs
  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0),
    'em_andamento', COALESCE(SUM(CASE WHEN p.status = 'em_andamento' THEN 1 ELSE 0 END), 0),
    'concluidos', COALESCE(SUM(CASE WHEN p.status = 'concluido' THEN 1 ELSE 0 END), 0),
    'rascunho', COALESCE(SUM(CASE WHEN p.status = 'rascunho' THEN 1 ELSE 0 END), 0)
  ) INTO v_pdis
  FROM pdis p
  JOIN colaboradores c ON c.id = p.colaborador_id
  WHERE c.company_id = p_company_id AND EXTRACT(YEAR FROM p.created_at) = p_year;

  -- 16. Treinamentos
  SELECT json_build_object(
    'concluidos', COALESCE((
      SELECT COUNT(*) FROM treinamento_progresso tp
      JOIN colaboradores c ON c.id = tp.colaborador_id
      WHERE c.company_id = p_company_id AND tp.status = 'concluido'
        AND EXTRACT(YEAR FROM tp.concluido_em) = p_year
    ), 0),
    'certificados', COALESCE((
      SELECT COUNT(*) FROM certificates
      WHERE company_id = p_company_id AND EXTRACT(YEAR FROM issue_date) = p_year
        AND status = 'ativo'
    ), 0)
  ) INTO v_treinamentos;

  -- 17. Promocoes count
  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0)
  ) INTO v_promocoes
  FROM promocoes_colaborador
  WHERE company_id = p_company_id AND EXTRACT(YEAR FROM data_promocao) = p_year;

  -- 18. Promocoes detalhadas
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_promocoes_detalhadas
  FROM (
    SELECT 
      c.full_name as nome_colaborador,
      pc.cargo_anterior,
      COALESCE(pc.nivel_anterior, '') as nivel_anterior,
      pc.cargo_novo,
      COALESCE(pc.nivel_novo, '') as nivel_novo,
      pc.data_promocao::TEXT as data_promocao
    FROM promocoes_colaborador pc
    JOIN colaboradores c ON c.id = pc.colaborador_id
    WHERE pc.company_id = p_company_id AND EXTRACT(YEAR FROM pc.data_promocao) = p_year
    ORDER BY pc.data_promocao DESC
  ) t;

  -- Build final result
  v_result := json_build_object(
    'headcount', v_headcount,
    'admissoes_mes', v_admissoes_mes,
    'desligamentos_mes', v_desligamentos_mes,
    'departamentos', v_departamentos,
    'gestao_tecnica', v_gestao_tecnica,
    'demografia_sexo', v_demografia_sexo,
    'demografia_raca', v_demografia_raca,
    'faixas_etarias', v_faixas_etarias,
    'geografia', v_geografia,
    'tempo_casa', v_tempo_casa,
    'cargos_niveis', v_cargos_niveis,
    'escolaridade', v_escolaridade,
    'feedback', v_feedback,
    'avaliacoes', v_avaliacoes,
    'pdis', v_pdis,
    'treinamentos', v_treinamentos,
    'promocoes', v_promocoes,
    'promocoes_detalhadas', v_promocoes_detalhadas
  );

  RETURN v_result;
END;
$function$;
