DROP FUNCTION IF EXISTS public.get_executive_report_data(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.get_executive_report_data(
  p_company_id uuid,
  p_year integer,
  p_gestao_tecnica text DEFAULT NULL,
  p_empresa_cliente text DEFAULT NULL
)
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
  v_desligamentos_detalhados JSON;
  v_diario_bordo_resultados JSON;
  v_feedbacks_detalhados JSON;
  v_feedbacks_alertas JSON;
  v_role app_role;
  v_all_years BOOLEAN;
  v_filter_gestao BOOLEAN;
  v_filter_cliente BOOLEAN;
BEGIN
  v_role := get_my_role();
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_all_years := (p_year = 0);
  v_filter_gestao := (p_gestao_tecnica IS NOT NULL AND p_gestao_tecnica != '');
  v_filter_cliente := (p_empresa_cliente IS NOT NULL AND p_empresa_cliente != '');

  SELECT json_build_object(
    'ativos', COALESCE(SUM(CASE WHEN status = 'ATIVO' THEN 1 ELSE 0 END), 0),
    'desligados', COALESCE(SUM(CASE WHEN status = 'DESLIGADO' THEN 1 ELSE 0 END), 0),
    'ferias', COALESCE(SUM(CASE WHEN status = 'FERIAS' THEN 1 ELSE 0 END), 0),
    'licenca', COALESCE(SUM(CASE WHEN status = 'LICENCA' THEN 1 ELSE 0 END), 0),
    'total', COUNT(*)
  ) INTO v_headcount
  FROM colaboradores WHERE company_id = p_company_id
    AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
    AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente);

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_admissoes_mes
  FROM (
    SELECT EXTRACT(YEAR FROM admission_date)::INTEGER as ano,
      EXTRACT(MONTH FROM admission_date)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM admission_date) = p_year)
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY ano, mes ORDER BY ano, mes
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_desligamentos_mes
  FROM (
    SELECT EXTRACT(YEAR FROM dc.data_desligamento)::INTEGER as ano,
      EXTRACT(MONTH FROM dc.data_desligamento)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM desligamentos_colaborador dc
    JOIN colaboradores c ON c.id = dc.colaborador_id
    WHERE c.company_id = p_company_id 
      AND (v_all_years OR EXTRACT(YEAR FROM dc.data_desligamento) = p_year)
      AND dc.acao = 'desligar'
      AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    GROUP BY ano, mes ORDER BY ano, mes
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_departamentos
  FROM (
    SELECT department as departamento, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY department ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_gestao_tecnica
  FROM (
    SELECT COALESCE(NULLIF(gestao_tecnica, ''), 'Sem Gestão Técnica') as gestor, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY gestor ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_demografia_sexo
  FROM (
    SELECT COALESCE(sex::TEXT, 'Não informado') as sexo, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY sexo ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_demografia_raca
  FROM (
    SELECT COALESCE(ethnicity::TEXT, 'Não informado') as raca, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY raca ORDER BY total DESC
  ) t;

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
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY faixa ORDER BY faixa
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_geografia
  FROM (
    SELECT COALESCE(NULLIF(address_state, ''), 'Não informado') as estado, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY estado ORDER BY total DESC
    LIMIT 10
  ) t;

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
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY faixa ORDER BY faixa
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_cargos_niveis
  FROM (
    SELECT job_title as cargo, COALESCE(job_level::TEXT, 'N/A') as nivel, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY job_title, job_level ORDER BY total DESC
    LIMIT 15
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_escolaridade
  FROM (
    SELECT COALESCE(education_level::TEXT, 'Não informado') as nivel, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR empresa_cliente = p_empresa_cliente)
    GROUP BY nivel ORDER BY total DESC
  ) t;

  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0),
    'concluidos', COALESCE(SUM(CASE WHEN fc.status = 'CONCLUIDO' THEN 1 ELSE 0 END), 0),
    'por_milestone', COALESCE(
      (SELECT json_agg(row_to_json(m)) FROM (
        SELECT fc2.milestone_type, COUNT(*)::INTEGER as total
        FROM feedback_cycles fc2
        JOIN colaboradores c ON c.id = fc2.colaborador_id
        WHERE fc2.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM fc2.created_at) = p_year)
          AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
          AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
        GROUP BY fc2.milestone_type
      ) m),
      '[]'::json
    )
  ) INTO v_feedback
  FROM feedback_cycles fc
  JOIN colaboradores c ON c.id = fc.colaborador_id
  WHERE fc.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM fc.created_at) = p_year)
    AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
    AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente);

  SELECT json_build_object(
    'ciclos_total', COALESCE((
      SELECT COUNT(*) FROM ciclos_avaliacao 
      WHERE company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM data_inicio) = p_year)
    ), 0),
    'avaliacoes_total', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      JOIN colaboradores c ON c.id = a.colaborador_id
      WHERE ca.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM ca.data_inicio) = p_year)
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ), 0),
    'autoavaliacoes_concluidas', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      JOIN colaboradores c ON c.id = a.colaborador_id
      WHERE ca.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM ca.data_inicio) = p_year)
        AND a.status_autoavaliacao = 'concluida'
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ), 0),
    'avaliacoes_gestor_concluidas', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      JOIN colaboradores c ON c.id = a.colaborador_id
      WHERE ca.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM ca.data_inicio) = p_year)
        AND a.status_avaliacao_gestor = 'concluida'
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ), 0)
  ) INTO v_avaliacoes;

  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0),
    'em_andamento', COALESCE(SUM(CASE WHEN p.status = 'em_andamento' THEN 1 ELSE 0 END), 0),
    'concluidos', COALESCE(SUM(CASE WHEN p.status = 'concluido' THEN 1 ELSE 0 END), 0),
    'rascunho', COALESCE(SUM(CASE WHEN p.status = 'rascunho' THEN 1 ELSE 0 END), 0)
  ) INTO v_pdis
  FROM pdis p
  JOIN colaboradores c ON c.id = p.colaborador_id
  WHERE c.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM p.created_at) = p_year)
    AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
    AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente);

  SELECT json_build_object(
    'concluidos', COALESCE((
      SELECT COUNT(*) FROM treinamento_progresso tp
      JOIN colaboradores c ON c.id = tp.colaborador_id
      WHERE c.company_id = p_company_id AND tp.status = 'concluido'
        AND (v_all_years OR EXTRACT(YEAR FROM tp.concluido_em) = p_year)
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ), 0),
    'certificados', COALESCE((
      SELECT COUNT(*) FROM certificates cert
      JOIN colaboradores c ON c.id = cert.colaborador_id
      WHERE cert.company_id = p_company_id 
        AND (v_all_years OR EXTRACT(YEAR FROM cert.issue_date) = p_year)
        AND cert.status = 'ativo'
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ), 0)
  ) INTO v_treinamentos;

  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0)
  ) INTO v_promocoes
  FROM promocoes_colaborador pc
  JOIN colaboradores c ON c.id = pc.colaborador_id
  WHERE pc.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM pc.data_promocao) = p_year)
    AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
    AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente);

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
    WHERE pc.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM pc.data_promocao) = p_year)
      AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ORDER BY pc.data_promocao DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_desligamentos_detalhados
  FROM (
    SELECT 
      c.full_name as nome_colaborador,
      c.job_title as cargo,
      COALESCE(c.job_level::TEXT, '') as nivel,
      c.admission_date::TEXT as data_admissao,
      dc.data_desligamento::TEXT as data_desligamento,
      COALESCE(dc.tipo_desligamento, 'Não informado') as tipo_desligamento,
      COALESCE(dc.motivo, 'Não informado') as motivo_desligamento
    FROM desligamentos_colaborador dc
    JOIN colaboradores c ON c.id = dc.colaborador_id
    WHERE c.company_id = p_company_id 
      AND (v_all_years OR EXTRACT(YEAR FROM dc.data_desligamento) = p_year)
      AND dc.acao = 'desligar'
      AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ORDER BY dc.data_desligamento DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_diario_bordo_resultados
  FROM (
    SELECT 
      c.full_name as nome_colaborador,
      fc.milestone_type::TEXT as milestone_type,
      ROUND(AVG(CASE WHEN fr.respondent_type = 'COLABORADOR' THEN fr.answer_value_numeric END), 2) as media_colaborador,
      ROUND(AVG(CASE WHEN fr.respondent_type = 'GESTOR' THEN fr.answer_value_numeric END), 2) as media_gestor
    FROM feedback_cycles fc
    JOIN feedback_responses fr ON fr.feedback_cycle_id = fc.id
    JOIN colaboradores c ON c.id = fc.colaborador_id
    WHERE fc.company_id = p_company_id
      AND fr.answer_value_numeric IS NOT NULL
      AND (v_all_years OR EXTRACT(YEAR FROM fc.created_at) = p_year)
      AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    GROUP BY c.full_name, fc.milestone_type
    ORDER BY c.full_name, fc.milestone_type
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_feedbacks_detalhados
  FROM (
    SELECT 
      c.full_name as nome_colaborador,
      fc.data_feedback::TEXT as data_feedback,
      fc.assunto,
      fc.detalhes_conversa
    FROM feedbacks_colaboradores fc
    JOIN colaboradores c ON c.id = fc.colaborador_id
    WHERE c.company_id = p_company_id
      AND (v_all_years OR EXTRACT(YEAR FROM fc.data_feedback::date) = p_year)
      AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    ORDER BY c.full_name, fc.data_feedback DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_feedbacks_alertas
  FROM (
    SELECT 
      COALESCE(NULLIF(c.gestao_tecnica, ''), 'Sem Gestão Técnica') as gestao_tecnica,
      COUNT(*)::INTEGER as total_feedbacks,
      COALESCE(SUM(CASE WHEN fc.alerta = true THEN 1 ELSE 0 END), 0)::INTEGER as total_alertas,
      json_agg(
        json_build_object(
          'nome', c.full_name,
          'cargo', c.job_title,
          'data_feedback', fc.data_feedback::TEXT,
          'alerta', fc.alerta
        ) ORDER BY fc.data_feedback DESC
      ) as colaboradores
    FROM feedbacks_colaboradores fc
    JOIN colaboradores c ON c.id = fc.colaborador_id
    WHERE c.company_id = p_company_id
      AND (v_all_years OR EXTRACT(YEAR FROM fc.data_feedback::date) = p_year)
      AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR c.empresa_cliente = p_empresa_cliente)
    GROUP BY COALESCE(NULLIF(c.gestao_tecnica, ''), 'Sem Gestão Técnica')
    ORDER BY gestao_tecnica
  ) t;

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
    'promocoes_detalhadas', v_promocoes_detalhadas,
    'desligamentos_detalhados', v_desligamentos_detalhados,
    'diario_bordo_resultados', v_diario_bordo_resultados,
    'feedbacks_detalhados', v_feedbacks_detalhados,
    'feedbacks_alertas', v_feedbacks_alertas
  );

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_executive_report_data(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_executive_report_data(uuid, integer, text, text) TO authenticated, service_role;