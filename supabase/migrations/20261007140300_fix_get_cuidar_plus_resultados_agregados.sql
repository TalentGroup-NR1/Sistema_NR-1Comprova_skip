-- Migration: 20261007140300_fix_get_cuidar_plus_resultados_agregados.sql
-- Descrição: Substitui referências à coluna inexistente c.empresa_cliente por c.razao_social em RPCs ativas do sistema.

-- 1) get_cuidar_plus_resultados_agregados
CREATE OR REPLACE FUNCTION public.get_cuidar_plus_resultados_agregados(
  p_dimensao text DEFAULT 'departamento',
  p_months int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_is_admin_master boolean;
  v_company_id uuid;
BEGIN
  PERFORM require_admin_role();

  IF p_dimensao NOT IN ('departamento','cliente') THEN
    RAISE EXCEPTION 'p_dimensao invalido: %', p_dimensao;
  END IF;
  IF p_months NOT IN (1, 3, 6, 12) THEN
    RAISE EXCEPTION 'p_months invalido: %', p_months;
  END IF;

  v_is_admin_master := public.is_admin_master(auth.uid());
  v_company_id := public.get_my_company_id();

  WITH base AS (
    SELECT
      CASE WHEN p_dimensao = 'cliente'
           THEN COALESCE(NULLIF(TRIM(c.razao_social), ''), 'Sem Cliente')
           ELSE COALESCE(NULLIF(TRIM(c.department), ''), 'Sem Departamento')
      END AS grupo,
      COALESCE(NULLIF(pq.pergunta, ''), 'Geral') AS dimensao,
      COALESCE(
        pr.score_numeric,
        NULLIF(regexp_replace(pr.resposta, '[^0-9.]', '', 'g'), '')::numeric
      ) AS valor,
      date_trunc('week', pr.created_at)::date AS semana,
      pr.employee_id AS colab
    FROM public.pulse_responses pr
    JOIN public.pulse_questions pq ON pq.id = pr.question_id
    JOIN public.colaboradores c ON c.id = pr.employee_id
    WHERE pr.created_at >= now() - (p_months || ' months')::interval
      AND (v_is_admin_master OR c.company_id = v_company_id)
  ),
  base_valida AS (
    SELECT * FROM base WHERE valor IS NOT NULL AND grupo IS NOT NULL
  ),
  totais_grupo AS (
    SELECT
      CASE WHEN p_dimensao = 'cliente'
           THEN COALESCE(NULLIF(TRIM(c.razao_social), ''), 'Sem Cliente')
           ELSE COALESCE(NULLIF(TRIM(c.department), ''), 'Sem Departamento')
      END AS grupo,
      COUNT(*)::int AS total_colaboradores
    FROM public.colaboradores c
    WHERE LOWER(COALESCE(c.status::text, '')) = 'ativo'
      AND (v_is_admin_master OR c.company_id = v_company_id)
    GROUP BY 1
  ),
  heatmap AS (
    SELECT
      b.grupo,
      b.dimensao,
      ROUND(AVG(b.valor)::numeric, 2) AS media,
      COUNT(DISTINCT b.colab)::int AS respondentes,
      COALESCE(tg.total_colaboradores, 0) AS total_colaboradores
    FROM base_valida b
    LEFT JOIN totais_grupo tg ON tg.grupo = b.grupo
    GROUP BY b.grupo, b.dimensao, tg.total_colaboradores
  ),
  timeline AS (
    SELECT
      grupo,
      semana,
      ROUND(AVG(valor)::numeric, 2) AS media,
      COUNT(DISTINCT colab)::int AS respondentes
    FROM base_valida
    GROUP BY grupo, semana
  )
  SELECT jsonb_build_object(
    'heatmap', COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM heatmap h), '[]'::jsonb),
    'timeline', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.semana) FROM timeline t), '[]'::jsonb),
    'grupos', COALESCE((SELECT jsonb_agg(DISTINCT grupo ORDER BY grupo) FROM base_valida), '[]'::jsonb),
    'dimensoes', COALESCE((SELECT jsonb_agg(DISTINCT dimensao ORDER BY dimensao) FROM base_valida), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2) get_aniversariantes_globais_mes
CREATE OR REPLACE FUNCTION public.get_aniversariantes_globais_mes(p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  nome text,
  dia int,
  tipo text,
  anos_empresa int,
  cliente_alocado text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH hoje AS (
    SELECT EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS mes,
           EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int AS ano
  )
  SELECT c.id,
         c.full_name::text AS nome,
         EXTRACT(DAY FROM c.birth_date)::int AS dia,
         'nascimento'::text AS tipo,
         NULL::int AS anos_empresa,
         COALESCE(NULLIF(TRIM(c.razao_social), ''), co.name)::text AS cliente_alocado,
         c.avatar_url
  FROM public.colaboradores c
  LEFT JOIN public.companies co ON co.id = c.company_id
  CROSS JOIN hoje
  WHERE c.status = 'ATIVO'
    AND c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date)::int = hoje.mes
    AND (p_company_id IS NULL OR c.company_id = p_company_id)
  UNION ALL
  SELECT c.id,
         c.full_name::text AS nome,
         EXTRACT(DAY FROM c.admission_date)::int AS dia,
         'empresa'::text AS tipo,
         (hoje.ano - EXTRACT(YEAR FROM c.admission_date)::int) AS anos_empresa,
         COALESCE(NULLIF(TRIM(c.razao_social), ''), co.name)::text AS cliente_alocado,
         c.avatar_url
  FROM public.colaboradores c
  LEFT JOIN public.companies co ON co.id = c.company_id
  CROSS JOIN hoje
  WHERE c.status = 'ATIVO'
    AND c.admission_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.admission_date)::int = hoje.mes
    AND (hoje.ano - EXTRACT(YEAR FROM c.admission_date)::int) >= 1
    AND (p_company_id IS NULL OR c.company_id = p_company_id)
  ORDER BY dia;
$$;


-- 3) get_executive_report_data
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
    AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente);

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_admissoes_mes
  FROM (
    SELECT EXTRACT(YEAR FROM admission_date)::INTEGER as ano,
      EXTRACT(MONTH FROM admission_date)::INTEGER as mes, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM admission_date) = p_year)
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
    GROUP BY ano, mes ORDER BY ano, mes
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_departamentos
  FROM (
    SELECT department as departamento, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
    GROUP BY department ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_gestao_tecnica
  FROM (
    SELECT COALESCE(NULLIF(gestao_tecnica, ''), 'Sem Gestão Técnica') as gestor, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
    GROUP BY gestor ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_demografia_sexo
  FROM (
    SELECT COALESCE(sex::TEXT, 'Não informado') as sexo, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
    GROUP BY sexo ORDER BY total DESC
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_demografia_raca
  FROM (
    SELECT COALESCE(ethnicity::TEXT, 'Não informado') as raca, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
    GROUP BY faixa ORDER BY faixa
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_geografia
  FROM (
    SELECT COALESCE(NULLIF(address_state, ''), 'Não informado') as estado, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
    GROUP BY faixa ORDER BY faixa
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_cargos_niveis
  FROM (
    SELECT job_title as cargo, COALESCE(job_level::TEXT, 'N/A') as nivel, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
    GROUP BY job_title, job_level ORDER BY total DESC
    LIMIT 15
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_escolaridade
  FROM (
    SELECT COALESCE(education_level::TEXT, 'Não informado') as nivel, COUNT(*)::INTEGER as total
    FROM colaboradores
    WHERE company_id = p_company_id AND status = 'ATIVO'
      AND (NOT v_filter_gestao OR gestao_tecnica = p_gestao_tecnica)
      AND (NOT v_filter_cliente OR razao_social = p_empresa_cliente)
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
          AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
        GROUP BY fc2.milestone_type
      ) m),
      '[]'::json
    )
  ) INTO v_feedback
  FROM feedback_cycles fc
  JOIN colaboradores c ON c.id = fc.colaborador_id
  WHERE fc.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM fc.created_at) = p_year)
    AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
    AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente);

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
        AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
    ), 0),
    'autoavaliacoes_concluidas', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      JOIN colaboradores c ON c.id = a.colaborador_id
      WHERE ca.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM ca.data_inicio) = p_year)
        AND a.status_autoavaliacao = 'concluida'
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
    ), 0),
    'avaliacoes_gestor_concluidas', COALESCE((
      SELECT COUNT(*) FROM avaliacoes a
      JOIN ciclos_avaliacao ca ON ca.id = a.ciclo_id
      JOIN colaboradores c ON c.id = a.colaborador_id
      WHERE ca.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM ca.data_inicio) = p_year)
        AND a.status_avaliacao_gestor = 'concluida'
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
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
    AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente);

  SELECT json_build_object(
    'concluidos', COALESCE((
      SELECT COUNT(*) FROM treinamento_progresso tp
      JOIN colaboradores c ON c.id = tp.colaborador_id
      WHERE c.company_id = p_company_id AND tp.status = 'concluido'
        AND (v_all_years OR EXTRACT(YEAR FROM tp.concluido_em) = p_year)
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
    ), 0),
    'certificados', COALESCE((
      SELECT COUNT(*) FROM certificates cert
      JOIN colaboradores c ON c.id = cert.colaborador_id
      WHERE cert.company_id = p_company_id 
        AND (v_all_years OR EXTRACT(YEAR FROM cert.issue_date) = p_year)
        AND cert.status = 'ativo'
        AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
        AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
    ), 0)
  ) INTO v_treinamentos;

  SELECT json_build_object(
    'total', COALESCE(COUNT(*), 0)
  ) INTO v_promocoes
  FROM promocoes_colaborador pc
  JOIN colaboradores c ON c.id = pc.colaborador_id
  WHERE pc.company_id = p_company_id AND (v_all_years OR EXTRACT(YEAR FROM pc.data_promocao) = p_year)
    AND (NOT v_filter_gestao OR c.gestao_tecnica = p_gestao_tecnica)
    AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente);

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
      AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
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
      AND (NOT v_filter_cliente OR c.razao_social = p_empresa_cliente)
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
-- 4) Ponto RPCs

-- Recria RPCs trocando 'ativo' por 'ATIVO' no filtro de status
CREATE OR REPLACE FUNCTION public.get_relatorio_absenteismo_v1(
  p_company_id uuid, p_data_inicio date, p_data_fim date,
  p_departamento text DEFAULT NULL, p_empresa_cliente text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_scope record; v_result jsonb;
  v_dias_periodo int; v_data_ini_ant date; v_data_fim_ant date;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();
  v_dias_periodo := (p_data_fim - p_data_inicio) + 1;
  v_data_ini_ant := p_data_inicio - v_dias_periodo;
  v_data_fim_ant := p_data_inicio - 1;

  WITH colabs AS (
    SELECT c.id, c.full_name, c.department, c.razao_social, c.base_salary,
           c.work_schedule_id, c.company_id,
           public.calc_horas_mensais_colab(c.id) AS horas_mensais,
           (c.base_salary / NULLIF(public.calc_horas_mensais_colab(c.id),0)) AS valor_hora
    FROM colaboradores c
    WHERE c.status = 'ATIVO'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (v_scope.is_admin OR c.company_id = v_scope.my_company_id OR v_scope.my_company_id IS NULL)
      AND (p_departamento IS NULL OR c.department = p_departamento)
      AND (p_empresa_cliente IS NULL OR c.razao_social = p_empresa_cliente)
      AND (NOT v_scope.is_admin OR get_my_role() = 'admin_master' OR c.company_id = get_my_company_id())
  ),
  resumo_periodo AS (
    SELECT r.colaborador_id,
           SUM(r.horas_previstas_minutos) AS prev_min,
           SUM(r.horas_trabalhadas_minutos) AS trab_min,
           SUM(r.horas_extras_minutos) AS extras_min,
           SUM(CASE WHEN r.horas_previstas_minutos > 0 AND r.horas_trabalhadas_minutos = 0
                        AND NOT EXISTS (
                          SELECT 1 FROM ponto_abonos a
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
  perdidas_abonadas AS (
    SELECT colaborador_id, SUM(min_abonados) AS min_perdidas_abonadas
    FROM abonos_cat
    WHERE categoria IN ('falta_injustificada','atraso','saida_antecipada')
    GROUP BY colaborador_id
  ),
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
  resumo_anterior AS (
    SELECT SUM(horas_previstas_minutos) AS prev_min,
           SUM(CASE WHEN horas_previstas_minutos>0 AND horas_trabalhadas_minutos=0 THEN horas_previstas_minutos ELSE 0 END) AS perdidas_min,
           SUM(horas_extras_minutos) AS extras_min
    FROM ponto_resumo_diario
    WHERE data BETWEEN v_data_ini_ant AND v_data_fim_ant
      AND colaborador_id IN (SELECT id FROM colabs)
  ),
  serie_mensal AS (
    SELECT date_trunc('month', r.data)::date AS mes,
           SUM(r.horas_previstas_minutos) AS prev_min,
           SUM(CASE WHEN r.horas_previstas_minutos>0 AND r.horas_trabalhadas_minutos=0 THEN r.horas_previstas_minutos ELSE 0 END) AS perdidas_min,
           SUM(r.horas_extras_minutos) AS extras_min
    FROM ponto_resumo_diario r
    WHERE r.data BETWEEN (p_data_inicio - INTERVAL '11 months')::date AND p_data_fim
      AND r.colaborador_id IN (SELECT id FROM colabs)
    GROUP BY 1 ORDER BY 1
  ),
  ranking_dept AS (
    SELECT COALESCE(cf.department,'Sem departamento') AS departamento,
           COUNT(*) AS colabs,
           SUM(cf.perdidas_min) AS perdidas_min,
           SUM(cf.prev_min) AS prev_min,
           CASE WHEN SUM(cf.prev_min)>0
                THEN ROUND((SUM(cf.perdidas_min)::numeric / SUM(cf.prev_min)) * 100, 2)
                ELSE 0 END AS ia_pct
    FROM colab_final cf GROUP BY 1 ORDER BY ia_pct DESC LIMIT 10
  ),
  breakdown AS (
    SELECT 'falta_implicita' AS categoria, SUM(falta_implicita_min) AS minutos FROM colab_final
    UNION ALL
    SELECT categoria, SUM(min_abonados) FROM abonos_cat GROUP BY categoria
  ),
  detalhado AS (
    SELECT cf.id, cf.full_name, cf.department, cf.empresa_cliente,
           cf.horas_mensais, cf.valor_hora, cf.base_salary,
           cf.prev_min, cf.trab_min, cf.extras_min,
           cf.falta_implicita_min, cf.min_perdidas_abonadas, cf.perdidas_min,
           cf.dias_falta_implicita,
           CASE WHEN cf.prev_min>0 THEN ROUND((cf.perdidas_min::numeric/cf.prev_min)*100, 2) ELSE 0 END AS ia_pct,
           CASE WHEN cf.valor_hora IS NOT NULL THEN ROUND(cf.valor_hora * (cf.perdidas_min::numeric/60), 2) ELSE NULL END AS custo_absent,
           CASE WHEN cf.valor_hora IS NOT NULL THEN ROUND(cf.valor_hora * 1.5 * (cf.extras_min::numeric/60), 2) ELSE NULL END AS custo_extras
    FROM colab_final cf ORDER BY ia_pct DESC
  ),
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
        'colaborador_id', id, 'nome', full_name, 'departamento', department, 'empresa_cliente', razao_social,
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
    WHERE c.status='ATIVO'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (p_departamento IS NULL OR c.department = p_departamento)
      AND (p_empresa_cliente IS NULL OR c.razao_social = p_empresa_cliente)
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
    WHERE c.status='ATIVO'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (NOT v_scope.is_admin OR get_my_role()='admin_master' OR c.company_id = get_my_company_id())
  ),
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
