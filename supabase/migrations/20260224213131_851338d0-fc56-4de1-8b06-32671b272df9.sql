
CREATE OR REPLACE FUNCTION public.get_executive_report_data(p_company_id UUID, p_year INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_headcount JSON;
  v_admissoes_mes JSON;
  v_desligamentos_mes JSON;
  v_departamentos JSON;
  v_feedback JSON;
  v_avaliacoes JSON;
  v_pdis JSON;
  v_treinamentos JSON;
  v_promocoes JSON;
  v_role app_role;
BEGIN
  -- Permission check
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 1. Headcount by status
  SELECT json_build_object(
    'ativos', COALESCE(SUM(CASE WHEN status = 'ATIVO' THEN 1 ELSE 0 END), 0),
    'desligados', COALESCE(SUM(CASE WHEN status = 'DESLIGADO' THEN 1 ELSE 0 END), 0),
    'ferias', COALESCE(SUM(CASE WHEN status = 'FERIAS' THEN 1 ELSE 0 END), 0),
    'licenca', COALESCE(SUM(CASE WHEN status = 'LICENCA' THEN 1 ELSE 0 END), 0),
    'total', COUNT(*)
  ) INTO v_headcount
  FROM colaboradores WHERE company_id = p_company_id;

  -- 2. Admissoes por mes no ano
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_admissoes_mes
  FROM (
    SELECT EXTRACT(MONTH FROM admission_date)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND EXTRACT(YEAR FROM admission_date) = p_year
    GROUP BY mes ORDER BY mes
  ) t;

  -- 3. Desligamentos por mes no ano
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_desligamentos_mes
  FROM (
    SELECT EXTRACT(MONTH FROM data_desligamento)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM desligamentos_colaborador dc
    JOIN colaboradores c ON c.id = dc.colaborador_id
    WHERE c.company_id = p_company_id 
      AND EXTRACT(YEAR FROM dc.data_desligamento) = p_year
      AND dc.acao = 'DESLIGAMENTO'
    GROUP BY mes ORDER BY mes
  ) t;

  -- 4. Distribuicao por departamento (ativos)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_departamentos
  FROM (
    SELECT department as departamento, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
    GROUP BY department ORDER BY total DESC
  ) t;

  -- 5. Feedback cycles (Diario de Bordo)
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

  -- 6. Avaliacoes
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

  -- 7. PDIs
  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0),
    'em_andamento', COALESCE(SUM(CASE WHEN p.status = 'em_andamento' THEN 1 ELSE 0 END), 0),
    'concluidos', COALESCE(SUM(CASE WHEN p.status = 'concluido' THEN 1 ELSE 0 END), 0),
    'rascunho', COALESCE(SUM(CASE WHEN p.status = 'rascunho' THEN 1 ELSE 0 END), 0)
  ) INTO v_pdis
  FROM pdis p
  JOIN colaboradores c ON c.id = p.colaborador_id
  WHERE c.company_id = p_company_id AND EXTRACT(YEAR FROM p.created_at) = p_year;

  -- 8. Treinamentos
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

  -- 9. Promocoes
  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0)
  ) INTO v_promocoes
  FROM promocoes_colaborador
  WHERE company_id = p_company_id AND EXTRACT(YEAR FROM data_promocao) = p_year;

  -- Build final result
  v_result := json_build_object(
    'headcount', v_headcount,
    'admissoes_mes', v_admissoes_mes,
    'desligamentos_mes', v_desligamentos_mes,
    'departamentos', v_departamentos,
    'feedback', v_feedback,
    'avaliacoes', v_avaliacoes,
    'pdis', v_pdis,
    'treinamentos', v_treinamentos,
    'promocoes', v_promocoes
  );

  RETURN v_result;
END;
$$;
