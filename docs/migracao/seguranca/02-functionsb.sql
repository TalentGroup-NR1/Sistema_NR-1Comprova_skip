-- SEÇÃO 2: FUNCTIONS (parte 2/4)
CREATE OR REPLACE FUNCTION public.get_cargos_by_ghe(p_ghe_id uuid)
 RETURNS SETOF cargos
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT * FROM public.cargos WHERE ghe_id = p_ghe_id ORDER BY nome;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_colaboradores_by_cargo(p_cargo_id uuid)
 RETURNS TABLE(id uuid, full_name text, matricula text, status text, avatar_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.cargos WHERE cargos.id = p_cargo_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
    SELECT c.id, c.full_name, c.matricula, c.status::text, c.avatar_url
    FROM public.colaboradores c WHERE c.cargo_id = p_cargo_id ORDER BY c.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_colaboradores_seguro(p_company_id uuid DEFAULT NULL::uuid, p_gestor_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF colaboradores
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid         uuid := auth.uid();
  v_is_master   boolean;
  v_my_company  uuid;
  v_role        public.app_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Rate limit: 30 req/min por usuário neste bucket
  PERFORM public.check_rate_limit(v_uid, 'colaboradores_list', 30, 60);

  v_is_master  := public.is_admin_master(v_uid);
  v_my_company := public.get_my_company_id();
  v_role       := public.get_my_role();

  -- Validação de escopo (não confiar no parâmetro do frontend)
  IF NOT v_is_master THEN
    IF p_company_id IS NOT NULL AND p_company_id <> v_my_company THEN
      RAISE EXCEPTION 'forbidden_company_scope' USING ERRCODE = '42501';
    END IF;
    -- Força para a empresa do usuário
    p_company_id := v_my_company;
  END IF;

  -- Gestor de departamento: ignora p_gestor_id do client e amarra ao próprio id
  IF v_role = 'gestor_departamento' THEN
    SELECT c.id INTO p_gestor_id
    FROM public.colaboradores c
    WHERE c.company_id = v_my_company
      AND c.email_pessoal = (
        SELECT p.email FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1
      )
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.colaboradores c
  WHERE (p_company_id IS NULL OR c.company_id = p_company_id)
    AND (p_gestor_id  IS NULL OR c.gestor_id  = p_gestor_id)
  ORDER BY c.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cuidar_plus_by_token(p_token uuid)
 RETURNS TABLE(questionario_id uuid, titulo character varying, descricao text, colaborador_name character varying, already_submitted boolean, perguntas jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.titulo,
    q.descricao,
    c.full_name,
    e.status = 'RESPONDIDO',
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'pergunta_texto', p.pergunta_texto,
        'tipo_pergunta', p.tipo_pergunta,
        'order_index', p.order_index
      ) ORDER BY p.order_index)
      FROM perguntas_cuidar_plus p
      WHERE p.questionario_id = q.id
    )
  FROM envios_cuidar_plus e
  JOIN questionarios_cuidar_plus q ON q.id = e.questionario_id
  JOIN colaboradores c ON c.id = e.colaborador_id
  WHERE e.token = p_token AND q.is_active = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cuidar_plus_resultados_agregados(p_dimensao text DEFAULT 'departamento'::text, p_months integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
           THEN COALESCE(NULLIF(TRIM(c.empresa_cliente), ''), 'Sem Cliente')
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
           THEN COALESCE(NULLIF(TRIM(c.empresa_cliente), ''), 'Sem Cliente')
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_comunicados(p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, company_id uuid, titulo text, resumo text, autor_nome character varying, data_publicacao timestamp with time zone, is_pinned boolean, is_read boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.company_id,
    c.titulo,
    LEFT(c.conteudo, 160) AS resumo,
    c.autor_nome,
    c.data_publicacao,
    c.is_pinned,
    EXISTS (
      SELECT 1
      FROM comunicado_leituras cl
      WHERE cl.comunicado_id = c.id
        AND cl.user_id = auth.uid()
    ) AS is_read
  FROM comunicados c
  WHERE c.company_id = get_my_company_id()
    AND c.status = 'publicado'
    AND c.data_publicacao <= now()
  ORDER BY
    is_pinned DESC,
    (EXISTS (
      SELECT 1
      FROM comunicado_leituras cl
      WHERE cl.comunicado_id = c.id
        AND cl.user_id = auth.uid()
    )) ASC,
    c.data_publicacao DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_pulse_history(p_employee_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(campaign_id uuid, campaign_title text, campaign_date date, question_id uuid, pergunta text, tipo text, resposta text, resposta_numerica integer, comentario text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é admin
  IF public.get_my_role() NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    pc.id as campaign_id,
    pc.titulo::TEXT as campaign_title,
    pc.data_inicio as campaign_date,
    pq.id as question_id,
    pq.pergunta,
    pq.tipo::TEXT,
    pr.resposta,
    CASE 
      WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 5
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'nao' THEN 0
      ELSE NULL
    END as resposta_numerica,
    pr.comentario,
    pr.created_at
  FROM pulse_responses pr
  JOIN pulse_campaigns pc ON pr.campaign_id = pc.id
  JOIN pulse_questions pq ON pr.question_id = pq.id
  WHERE pr.employee_id = p_employee_id
  ORDER BY pr.created_at DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_espelho_responsavel(p_espelho_id uuid)
 RETURNS TABLE(nome text, cargo text, fechado_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_fechado_em timestamptz;
  v_company_id uuid;
  v_colab_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  SELECT e.fechado_por, e.fechado_em, e.company_id, e.colaborador_id
    INTO v_user_id, v_fechado_em, v_company_id, v_colab_id
  FROM public.espelhos_ponto_mensais e
  WHERE e.id = p_espelho_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Autorização: dono do espelho OU admin/rh/gestor da mesma empresa
  IF NOT (
    EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = v_colab_id AND c.user_id = v_caller)
    OR public.get_my_role() IN ('admin_master','admin_empresa','analista_rh','gestor_departamento')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(TRIM(c.full_name), ''),
      split_part(p.email, '@', 1),
      'Responsável pelo fechamento'
    )::text AS nome,
    c.job_title::text AS cargo,
    v_fechado_em AS fechado_em
  FROM (SELECT 1) x
  LEFT JOIN public.profiles p ON p.user_id = v_user_id
  LEFT JOIN public.colaboradores c ON c.user_id = v_user_id
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_estrutura_organizacional(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public.estrut_can_read(p_company_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COALESCE(jsonb_agg(un ORDER BY un->>'nome'), '[]'::jsonb) INTO v
  FROM (
    SELECT jsonb_build_object(
      'id', u.id, 'nome', u.nome, 'tipo', u.tipo, 'endereco', u.endereco,
      'cidade', u.cidade, 'estado', u.estado, 'cep', u.cep, 'ativa', u.ativa,
      'departamentos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'nome', d.nome, 'codigo', d.codigo, 'ativo', d.ativo,
          'responsavel_id', d.responsavel_id,
          'responsavel_nome', (SELECT c2.full_name FROM public.colaboradores c2 WHERE c2.id = d.responsavel_id),
          'n_colaboradores', (
            SELECT count(*) FROM public.colaboradores cd
            JOIN public.cargos cdc ON cdc.id = cd.cargo_id
            JOIN public.ghes cdg ON cdg.id = cdc.ghe_id
            JOIN public.setores cds ON cds.id = cdg.setor_id
            WHERE cds.departamento_id = d.id AND cd.status = 'ATIVO'::colaborador_status
          ),
          'setores', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', s.id, 'nome', s.nome, 'ambiente_fisico', s.ambiente_fisico,
              'andar', s.andar, 'localizacao', s.localizacao, 'ativo', s.ativo,
              'n_colaboradores', (
                SELECT count(*) FROM public.colaboradores cs
                JOIN public.cargos csc ON csc.id = cs.cargo_id
                JOIN public.ghes csg ON csg.id = csc.ghe_id
                WHERE csg.setor_id = s.id AND cs.status = 'ATIVO'::colaborador_status
              ),
              'ghes', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                  'id', g.id, 'codigo', g.codigo, 'nome', g.nome, 'descricao', g.descricao,
                  'tipo_exposicao', g.tipo_exposicao, 'ativo', g.ativo,
                  'n_trabalhadores', (
                    SELECT count(*) FROM public.colaboradores cc
                    JOIN public.cargos c3 ON c3.id = cc.cargo_id
                    WHERE c3.ghe_id = g.id AND cc.status = 'ATIVO'::colaborador_status
                  ),
                  'cargos', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                      'id', c.id, 'nome', c.nome, 'cbo_codigo', c.cbo_codigo,
                      'cbo_descricao', c.cbo_descricao, 'ativo', c.ativo,
                      'risco_exposicao', c.risco_exposicao,
                      'tempo_exposicao_horas_dia', c.tempo_exposicao_horas_dia,
                      'tarefa_prescrita', c.tarefa_prescrita,
                      'tarefa_real', c.tarefa_real,
                      'descricao_atividades', c.descricao_atividades,
                      'carga_horaria_semanal', c.carga_horaria_semanal,
                      'n_colaboradores', (SELECT count(*) FROM public.colaboradores cc2 WHERE cc2.cargo_id = c.id)
                    ) ORDER BY c.nome)
                    FROM public.cargos c WHERE c.ghe_id = g.id
                  ), '[]'::jsonb)
                ) ORDER BY g.codigo NULLS LAST, g.nome)
                FROM public.ghes g WHERE g.setor_id = s.id
              ), '[]'::jsonb)
            ) ORDER BY s.nome)
            FROM public.setores s WHERE s.departamento_id = d.id
          ), '[]'::jsonb)
        ) ORDER BY d.nome)
        FROM public.departamentos d WHERE d.unidade_id = u.id
      ), '[]'::jsonb)
    ) AS un
    FROM public.unidades_organizacionais u
    WHERE u.company_id = p_company_id
  ) t;

  RETURN COALESCE(v, '[]'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_executive_report_data(p_company_id uuid, p_year integer, p_gestao_tecnica text DEFAULT NULL::text, p_empresa_cliente text DEFAULT NULL::text)
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_feedback_cycle_by_token(p_token uuid)
 RETURNS TABLE(cycle_id uuid, colaborador_name character varying, milestone_type milestone_type, respondent_type respondent_type, template_id uuid, already_submitted boolean, questions jsonb, questionnaire_configured boolean, questionnaire_auto_resolved boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_cycle_id UUID;
  v_respondent respondent_type;
  v_template_id UUID;
  v_company_id UUID;
  v_milestone milestone_type;
  v_auto BOOLEAN := false;
BEGIN
  SELECT fc.id, COALESCE(fc.collaborator_questionnaire_template_id, fc.questionnaire_template_id), fc.company_id, fc.milestone_type
  INTO v_cycle_id, v_template_id, v_company_id, v_milestone
  FROM feedback_cycles fc
  WHERE fc.collaborator_token = p_token;

  IF v_cycle_id IS NOT NULL THEN
    v_respondent := 'COLABORADOR';
  ELSE
    SELECT fc.id, COALESCE(fc.gestor_questionnaire_template_id, fc.questionnaire_template_id), fc.company_id, fc.milestone_type
    INTO v_cycle_id, v_template_id, v_company_id, v_milestone
    FROM feedback_cycles fc
    WHERE fc.gestor_token = p_token;

    IF v_cycle_id IS NOT NULL THEN
      v_respondent := 'GESTOR';
    END IF;
  END IF;

  IF v_cycle_id IS NULL THEN
    RETURN;
  END IF;

  -- fallback: template não definido ou sem perguntas para este respondente
  IF v_template_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM questions q
      WHERE q.questionnaire_template_id = v_template_id
        AND (q.respondent_type = v_respondent OR q.respondent_type = 'AMBOS')
  ) THEN
    v_template_id := public.resolve_feedback_template(v_company_id, v_milestone, v_respondent);
    v_auto := v_template_id IS NOT NULL;
  END IF;

  RETURN QUERY
  SELECT
    fc.id,
    c.full_name,
    fc.milestone_type,
    v_respondent,
    v_template_id,
    EXISTS (
      SELECT 1 FROM feedback_responses fr
      WHERE fr.feedback_cycle_id = fc.id AND fr.respondent_type = v_respondent
    ),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'question_text', q.question_text,
          'question_type', q.question_type,
          'scale_min', q.scale_min,
          'scale_max', q.scale_max,
          'respondent_type', q.respondent_type,
          'order_index', q.order_index
        ) ORDER BY q.order_index
      )
      FROM questions q
      WHERE q.questionnaire_template_id = v_template_id
        AND (q.respondent_type = v_respondent OR q.respondent_type = 'AMBOS')
    ),
    (v_template_id IS NOT NULL),
    v_auto
  FROM feedback_cycles fc
  JOIN colaboradores c ON c.id = fc.colaborador_id
  WHERE fc.id = v_cycle_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ghe_epis(p_ghe_id uuid)
 RETURNS SETOF ghe_epis
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL OR NOT public.estrut_can_read(v_company) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT * FROM public.ghe_epis WHERE ghe_id = p_ghe_id ORDER BY nome_epi;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_meus_espelhos_mensais()
 RETURNS SETOF espelhos_ponto_mensais
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT e.*
    FROM public.espelhos_ponto_mensais e
    JOIN public.colaboradores c ON c.id = e.colaborador_id
   WHERE c.user_id = auth.uid()
   ORDER BY e.ano DESC, e.mes DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_meus_fechamentos_mensais(p_colaborador_id uuid)
 RETURNS SETOF banco_horas_fechamentos
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.banco_horas_fechamentos
  WHERE colaborador_id = p_colaborador_id
    AND status IN ('fechado', 'reaberto', 'assinado')
    AND date_trunc('month', periodo_inicio)::date = periodo_inicio
    AND date_trunc('month', periodo_fim)::date = periodo_fim
    AND periodo_fim = (periodo_inicio + interval '1 month - 1 day')::date
  ORDER BY periodo_fim DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_colaborador_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_pulse_campaign_history()
 RETURNS TABLE(campaign_id uuid, titulo character varying, data_inicio date, data_fim date, responded_at timestamp with time zone, responses jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colaborador_id UUID;
BEGIN
  SELECT id INTO v_colaborador_id
  FROM public.colaboradores
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.titulo,
    c.data_inicio,
    c.data_fim,
    MIN(pr.created_at) as responded_at,
    jsonb_agg(
      jsonb_build_object(
        'pergunta', pq.pergunta,
        'tipo', pq.tipo,
        'resposta', pr.resposta,
        'comentario', pr.comentario
      ) ORDER BY pq.ordem
    ) as responses
  FROM public.pulse_campaigns c
  JOIN public.pulse_responses pr ON pr.campaign_id = c.id
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.employee_id = v_colaborador_id
  GROUP BY c.id, c.titulo, c.data_inicio, c.data_fim
  ORDER BY c.data_inicio DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role <> 'super_admin'
  ORDER BY CASE role
    WHEN 'admin_master' THEN 1
    WHEN 'admin_empresa' THEN 2
    WHEN 'analista_rh' THEN 3
    WHEN 'gestor_departamento' THEN 4
    WHEN 'colaborador' THEN 5
    ELSE 6
  END
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pending_pulse_respondents(p_company_id uuid)
 RETURNS TABLE(colaborador_id uuid, full_name text, corporate_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_week INTEGER;
  current_year INTEGER;
BEGIN
  current_week := EXTRACT(WEEK FROM now())::INTEGER;
  current_year := EXTRACT(YEAR FROM now())::INTEGER;
  
  RETURN QUERY
  SELECT 
    c.id as colaborador_id,
    c.full_name::TEXT,
    c.corporate_email::TEXT
  FROM public.colaboradores c
  WHERE c.company_id = p_company_id
    AND c.status = 'ATIVO'  -- CORREÇÃO: Usar 'ATIVO' em vez de 'ativo'
    AND NOT EXISTS (
      SELECT 1 FROM public.pulse_surveys ps
      WHERE ps.employee_id = c.id
        AND ps.week_number = current_week
        AND ps.year = current_year
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_plataforma_empresas()
 RETURNS TABLE(id uuid, name text, brand_name text, cnpj text, status text, is_internal boolean, created_at timestamp with time zone, total_colaboradores bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT c.id,
         c.name::text,
         c.brand_name::text,
         c.cnpj::text,
         c.status::text,
         COALESCE(c.is_internal, false),
         c.created_at,
         (SELECT count(*) FROM public.colaboradores col WHERE col.company_id = c.id)
  FROM public.companies c
  ORDER BY c.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_plataforma_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'empresas_ativas', (SELECT count(*) FROM public.companies WHERE status = 'active'),
    'empresas_internas', (SELECT count(*) FROM public.companies WHERE is_internal IS TRUE),
    'empresas_externas', (SELECT count(*) FROM public.companies WHERE is_internal IS NOT TRUE),
    'empresas_suspensas', (SELECT count(*) FROM public.companies WHERE status = 'suspended'),
    'total_usuarios', (SELECT count(*) FROM public.profiles),
    'novos_30_dias', (SELECT count(*) FROM public.companies WHERE created_at >= now() - interval '30 days')
  ) INTO v;

  RETURN v;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_proart_ativacao_vigente()
 RETURNS TABLE(id uuid, company_id uuid, titulo text, data_inicio date, data_fim date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT a.id, a.company_id, a.titulo, a.data_inicio, a.data_fim
  FROM public.nr1_proart_ativacoes a
  WHERE a.company_id = public.get_my_company_id()
    AND a.ativo = true
    AND a.data_inicio <= CURRENT_DATE
    AND a.data_fim >= CURRENT_DATE
  ORDER BY a.data_inicio DESC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pulse_campaign_results(p_campaign_id uuid, p_department text DEFAULT NULL::text, p_min_score integer DEFAULT NULL::integer, p_max_score integer DEFAULT NULL::integer, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(response_id uuid, question_id uuid, pergunta text, tipo text, resposta text, resposta_numerica integer, comentario text, employee_id uuid, colaborador_nome text, departamento character varying, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
  v_admin_id UUID;
  v_is_admin_master BOOLEAN;
BEGIN
  -- Verificar permissão de admin
  IF public.get_my_role() NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  v_is_admin_master := public.get_my_role() = 'admin_master';
  v_company_id := public.get_my_company_id();
  v_admin_id := auth.uid();
  
  -- Verificar se campanha existe
  IF v_is_admin_master THEN
    IF NOT EXISTS (SELECT 1 FROM public.pulse_campaigns WHERE id = p_campaign_id) THEN
      RAISE EXCEPTION 'Campanha não encontrada';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.pulse_campaigns
      WHERE id = p_campaign_id AND company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Campanha não encontrada';
    END IF;
  END IF;
  
  -- Registrar acesso
  INSERT INTO public.pulse_access_logs (admin_id, campaign_id, acao, detalhes)
  VALUES (v_admin_id, p_campaign_id, 'visualizou_resultados', jsonb_build_object(
    'filters', jsonb_build_object(
      'department', p_department,
      'min_score', p_min_score,
      'max_score', p_max_score
    )
  ));
  
  RETURN QUERY
  SELECT 
    pr.id as response_id,
    pr.question_id,
    pq.pergunta,
    pq.tipo::TEXT,
    pr.resposta,
    CASE 
      WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 5
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'nao' THEN 0
      ELSE NULL
    END as resposta_numerica,
    pr.comentario,
    pr.employee_id,
    c.nome as colaborador_nome,
    c.departamento,
    pr.created_at
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE pr.campaign_id = p_campaign_id
    AND (p_department IS NULL OR c.departamento = p_department)
    AND (
      p_min_score IS NULL 
      OR (pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= p_min_score)
      OR (pq.tipo = 'sim_nao' AND pr.resposta = 'nao' AND p_min_score <= 0)
      OR (pq.tipo = 'sim_nao' AND pr.resposta = 'sim' AND p_min_score <= 5)
    )
    AND (
      p_max_score IS NULL 
      OR (pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER <= p_max_score)
      OR (pq.tipo = 'sim_nao' AND pr.resposta = 'nao' AND p_max_score >= 0)
      OR (pq.tipo = 'sim_nao' AND pr.resposta = 'sim' AND p_max_score >= 5)
    )
  ORDER BY pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pulse_campaign_stats(p_campaign_id uuid)
 RETURNS TABLE(total_responses bigint, avg_score numeric, participation_rate numeric, score_distribution jsonb, department_breakdown jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
  v_campaign_company_id UUID;
  v_total_colaboradores BIGINT;
  v_is_admin_master BOOLEAN;
BEGIN
  v_is_admin_master := public.get_my_role() = 'admin_master';
  v_company_id := public.get_my_company_id();
  
  -- Buscar company_id da campanha para calcular participação correta
  SELECT empresa_id INTO v_campaign_company_id
  FROM public.pulse_campaigns
  WHERE id = p_campaign_id;
  
  -- Contar colaboradores ativos
  SELECT COUNT(DISTINCT id) INTO v_total_colaboradores
  FROM public.colaboradores
  WHERE empresa_id = v_campaign_company_id AND status = 'ativo';
  
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pr.employee_id)::BIGINT as total_responses,
    ROUND(AVG(
      CASE 
        WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::NUMERIC
        ELSE NULL
      END
    ), 2) as avg_score,
    ROUND((COUNT(DISTINCT pr.employee_id)::NUMERIC / NULLIF(v_total_colaboradores, 0)) * 100, 1) as participation_rate,
    (
      SELECT jsonb_object_agg(score, count)
      FROM (
        SELECT pr2.resposta as score, COUNT(*) as count
        FROM public.pulse_responses pr2
        JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
        WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
        GROUP BY pr2.resposta
      ) s
    ) as score_distribution,
    (
      SELECT jsonb_object_agg(dept, avg_score)
      FROM (
        SELECT c2.departamento as dept, ROUND(AVG(pr2.resposta::NUMERIC), 2) as avg_score
        FROM public.pulse_responses pr2
        JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
        JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
        WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
        GROUP BY c2.departamento
      ) d
    ) as department_breakdown
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.campaign_id = p_campaign_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pulse_colaboradores_list(p_company_id uuid, p_department text DEFAULT NULL::text)
 RETURNS TABLE(employee_id uuid, nome text, departamento character varying, cargo character varying, foto_url text, total_respostas bigint, media_geral numeric, ultima_resposta timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar permissão
  IF public.get_my_role() NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as employee_id,
    c.full_name::TEXT as nome,
    c.department as departamento,
    c.job_title as cargo,
    c.avatar_url as foto_url,
    COUNT(DISTINCT pr.id) as total_respostas,
    ROUND(AVG(
      CASE 
        WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
        ELSE NULL
      END
    )::NUMERIC, 2) as media_geral,
    MAX(pr.created_at) as ultima_resposta
  FROM colaboradores c
  LEFT JOIN pulse_responses pr ON c.id = pr.employee_id
  LEFT JOIN pulse_questions pq ON pr.question_id = pq.id
  WHERE c.company_id = p_company_id
    AND c.status = 'ATIVO'
    AND (p_department IS NULL OR c.department = p_department)
  GROUP BY c.id, c.full_name, c.department, c.job_title, c.avatar_url
  ORDER BY c.full_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pulse_comments(p_company_id uuid, p_year integer DEFAULT (EXTRACT(year FROM now()))::integer, p_week_number integer DEFAULT NULL::integer)
 RETURNS TABLE(score integer, comment text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ps.score,
    ps.comment,
    ps.created_at
  FROM public.pulse_surveys ps
  WHERE ps.company_id = p_company_id
    AND ps.year = p_year
    AND (p_week_number IS NULL OR ps.week_number = p_week_number)
    AND ps.comment IS NOT NULL 
    AND ps.comment != ''
  ORDER BY ps.created_at DESC
  LIMIT 50;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pulse_dashboard(p_company_id uuid, p_year integer DEFAULT (EXTRACT(year FROM now()))::integer, p_weeks_back integer DEFAULT 4)
 RETURNS TABLE(week_number integer, year integer, total_responses bigint, avg_score numeric, score_0 bigint, score_1 bigint, score_2 bigint, score_3 bigint, score_4 bigint, score_5 bigint, comments_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_week INTEGER;
BEGIN
  current_week := EXTRACT(WEEK FROM now())::INTEGER;
  
  RETURN QUERY
  SELECT 
    ps.week_number,
    ps.year,
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(ps.score)::NUMERIC, 2) as avg_score,
    COUNT(CASE WHEN ps.score = 0 THEN 1 END)::BIGINT as score_0,
    COUNT(CASE WHEN ps.score = 1 THEN 1 END)::BIGINT as score_1,
    COUNT(CASE WHEN ps.score = 2 THEN 1 END)::BIGINT as score_2,
    COUNT(CASE WHEN ps.score = 3 THEN 1 END)::BIGINT as score_3,
    COUNT(CASE WHEN ps.score = 4 THEN 1 END)::BIGINT as score_4,
    COUNT(CASE WHEN ps.score = 5 THEN 1 END)::BIGINT as score_5,
    COUNT(CASE WHEN ps.comment IS NOT NULL AND ps.comment != '' THEN 1 END)::BIGINT as comments_count
  FROM public.pulse_surveys ps
  WHERE ps.company_id = p_company_id
    AND ps.year = p_year
    AND ps.week_number >= (current_week - p_weeks_back)
    AND ps.week_number <= current_week
  GROUP BY ps.week_number, ps.year
  ORDER BY ps.year DESC, ps.week_number DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pulse_trend_data(p_company_id uuid, p_months_back integer DEFAULT 6)
 RETURNS TABLE(campaign_id uuid, campaign_title text, campaign_date date, avg_score numeric, total_responses bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin_master BOOLEAN;
BEGIN
  v_is_admin_master := public.get_my_role() = 'admin_master';
  
  RETURN QUERY
  SELECT 
    pc.id as campaign_id,
    pc.titulo::TEXT as campaign_title,
    pc.data_inicio as campaign_date,
    ROUND(AVG(
      CASE 
        WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
        ELSE NULL
      END
    )::NUMERIC, 2) as avg_score,
    COUNT(DISTINCT pr.employee_id)::BIGINT as total_responses
  FROM public.pulse_campaigns pc
  LEFT JOIN public.pulse_responses pr ON pr.campaign_id = pc.id
  LEFT JOIN public.pulse_questions pq ON pr.question_id = pq.id
  WHERE (v_is_admin_master OR pc.empresa_id = p_company_id)
    AND pc.data_inicio >= CURRENT_DATE - (p_months_back || ' months')::INTERVAL
  GROUP BY pc.id, pc.titulo, pc.data_inicio
  ORDER BY pc.data_inicio ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_questionario_para_colaborador(p_atribuicao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_colab uuid; v_row record; v_ident jsonb; v_respostas jsonb;
BEGIN
  v_colab := public.get_my_colaborador_id();
  IF v_colab IS NULL THEN RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  SELECT a.id, a.status, a.data_atribuicao, a.data_resposta, dq.customizacao, dq.instrucoes,
         m.instrucoes AS instrucoes_modelo, d.titulo, d.id AS descricao_id
  INTO v_row
  FROM public.questionario_atribuicoes a
  JOIN public.descricao_questionario dq ON dq.id = a.descricao_questionario_id
  LEFT JOIN public.questionario_modelos m ON m.id = dq.modelo_base_id
  JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id
  WHERE a.id = p_atribuicao_id AND a.colaborador_id = v_colab;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='42501'; END IF;

  SELECT jsonb_build_object(
    'nome', c.full_name,
    'cargo', COALESCE(cg.nome, c.job_title),
    'nivel', c.job_level,
    'empresa', co.name,
    'empresa_cliente', c.empresa_cliente,
    'departamento', c.department,
    'gestao_tecnica', c.gestao_tecnica
  ) INTO v_ident
  FROM public.colaboradores c
  LEFT JOIN public.cargos cg ON cg.id = c.cargo_id
  LEFT JOIN public.companies co ON co.id = c.company_id
  WHERE c.id = v_colab;

  SELECT COALESCE(jsonb_object_agg(r.pergunta_id, r.valor), '{}'::jsonb) INTO v_respostas
  FROM public.questionario_respostas r WHERE r.atribuicao_id = p_atribuicao_id;

  RETURN jsonb_build_object(
    'atribuicao_id', v_row.id,
    'status', v_row.status,
    'titulo', v_row.titulo,
    'instrucoes', COALESCE(v_row.instrucoes, v_row.instrucoes_modelo),
    'customizacao', v_row.customizacao,
    'identificacao', v_ident,
    'respostas', v_respostas
  );
END; $function$
;

CREATE OR REPLACE FUNCTION public.get_relatorio_absenteismo_v1(p_company_id uuid, p_data_inicio date, p_data_fim date, p_departamento text DEFAULT NULL::text, p_empresa_cliente text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_scope record; v_result jsonb;
  v_dias_periodo int; v_data_ini_ant date; v_data_fim_ant date;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();
  v_dias_periodo := (p_data_fim - p_data_inicio) + 1;
  v_data_ini_ant := p_data_inicio - v_dias_periodo;
  v_data_fim_ant := p_data_inicio - 1;

  WITH colabs AS (
    SELECT c.id, c.full_name, c.department, c.empresa_cliente, c.base_salary,
           c.work_schedule_id, c.company_id,
           public.calc_horas_mensais_colab(c.id) AS horas_mensais,
           (c.base_salary / NULLIF(public.calc_horas_mensais_colab(c.id),0)) AS valor_hora
    FROM colaboradores c
    WHERE c.status = 'ATIVO'
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (v_scope.is_admin OR c.gestor_id = v_scope.my_colab_id)
      AND (v_scope.is_admin OR c.company_id = v_scope.my_company_id OR v_scope.my_company_id IS NULL)
      AND (p_departamento IS NULL OR c.department = p_departamento)
      AND (p_empresa_cliente IS NULL OR c.empresa_cliente = p_empresa_cliente)
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_relatorio_jornada_v1(p_company_id uuid, p_data_inicio date, p_data_fim date, p_departamento text DEFAULT NULL::text, p_empresa_cliente text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_scope record; v_result jsonb;
BEGIN
  SELECT * INTO v_scope FROM public._relatorios_ponto_scope();
  WITH colabs AS (
    SELECT c.id FROM colaboradores c
    WHERE c.status='ATIVO'
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_saldos_para_fechamento(p_company_id uuid, p_periodo_inicio date, p_periodo_fim date)
 RETURNS TABLE(colaborador_id uuid, full_name text, matricula text, department text, saldo_minutos integer, tratativa_id uuid, tratativa_acao tratativa_saldo_acao, tratativa_observacao text, decidido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_my_company uuid;
BEGIN
  v_role := public.get_my_role();
  v_my_company := public.get_my_company_id();
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF v_role <> 'admin_master' AND p_company_id <> v_my_company THEN
    RAISE EXCEPTION 'Empresa fora do escopo';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.full_name::text,
    c.matricula::text,
    c.department::text,
    COALESCE(s.saldo, 0)::int,
    t.id,
    t.acao,
    t.observacao,
    t.decidido_em
  FROM public.colaboradores c
  LEFT JOIN LATERAL (
    SELECT SUM(r.saldo_minutos)::int AS saldo
    FROM public.ponto_resumo_diario r
    WHERE r.colaborador_id = c.id
      AND r.data BETWEEN p_periodo_inicio AND p_periodo_fim
      AND (c.admission_date IS NULL OR r.data >= c.admission_date)
  ) s ON true
  LEFT JOIN public.ponto_fechamento_tratativas t
    ON t.colaborador_id = c.id
   AND t.periodo_inicio = p_periodo_inicio
   AND t.periodo_fim    = p_periodo_fim
  WHERE c.company_id = p_company_id
    AND c.status = 'ATIVO'
    AND c.contract_type::text IN ('CLT','Estágio','Aprendiz','Temporário')
  ORDER BY c.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_notifications(p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, type text, title text, message text, action_url text, priority text, is_read boolean, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  (
    SELECT n.id, n.type, n.title, n.message, n.action_url, n.priority, n.is_read, n.created_at
    FROM notifications n
    WHERE n.user_id = auth.uid()
      AND n.company_id = get_my_company_id()
  )
  UNION ALL
  (
    SELECT 
      c.id,
      'comunicado'::TEXT as type,
      c.titulo::TEXT as title,
      LEFT(c.conteudo, 160)::TEXT as message,
      '/comunicados'::TEXT as action_url,
      CASE WHEN c.is_pinned THEN 'high' ELSE 'normal' END as priority,
      EXISTS (
        SELECT 1 FROM comunicado_leituras cl
        WHERE cl.comunicado_id = c.id AND cl.user_id = auth.uid()
      ) as is_read,
      c.data_publicacao as created_at
    FROM comunicados c
    WHERE c.company_id = get_my_company_id()
      AND c.status = 'publicado'
      AND c.data_publicacao <= now()
  )
  ORDER BY is_read ASC, created_at DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin_master');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'colaborador');
  END IF;
  
  -- Also create a profile for the new user
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin_master'
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_dia_previsto(p_colaborador_id uuid, p_data date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ws_id uuid;
  v_dias int[];
  v_trab_fer boolean := false;
  v_dow int;
  v_company uuid;
  v_is_feriado boolean := false;
BEGIN
  SELECT company_id, work_schedule_id
    INTO v_company, v_ws_id
  FROM public.colaboradores
  WHERE id = p_colaborador_id;

  IF v_company IS NULL THEN
    RETURN false;
  END IF;

  IF v_ws_id IS NOT NULL THEN
    SELECT dias_semana, COALESCE(trabalha_feriados, false)
      INTO v_dias, v_trab_fer
    FROM public.work_schedules
    WHERE id = v_ws_id;
  END IF;

  IF v_dias IS NULL OR array_length(v_dias, 1) IS NULL THEN
    v_dias := ARRAY[1,2,3,4,5];
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.feriados
    WHERE company_id = v_company AND data = p_data
  ) INTO v_is_feriado;

  IF v_is_feriado THEN
    RETURN v_trab_fer;
  END IF;

  v_dow := EXTRACT(DOW FROM p_data)::int;
  RETURN v_dow = ANY(v_dias);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_periodo_fechado(p_colaborador_id uuid, p_data date)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.banco_horas_fechamentos
    WHERE colaborador_id = p_colaborador_id
      AND status IN ('fechado','assinado')
      AND p_data BETWEEN periodo_inicio AND periodo_fim
  ) OR EXISTS (
    SELECT 1 FROM public.espelhos_ponto_mensais
    WHERE colaborador_id = p_colaborador_id
      AND status IN ('fechado','assinado')
      AND p_data BETWEEN periodo_inicio AND periodo_fim
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.lgpd_can_manage(_company_id uuid, _require_admin_empresa boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    public.admin_master_scope(_company_id)
    OR (
      public.get_my_company_id() = _company_id
      AND (
        public.get_my_role() = 'admin_empresa'::app_role
        OR (NOT _require_admin_empresa AND public.get_my_role() = 'analista_rh'::app_role)
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.listar_campanhas_ativas()
 RETURNS TABLE(id uuid, company_id uuid, titulo text, descricao text, imagem_url text, data_inicio date, data_fim date, status text, created_at timestamp with time zone, materiais jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id, c.company_id, c.titulo, c.descricao, c.imagem_url,
    c.data_inicio, c.data_fim,
    public.calcular_status_campanha(c.data_inicio, c.data_fim) AS status,
    c.created_at,
    COALESCE(c.materiais, '[]'::jsonb) AS materiais
  FROM public.campanhas_comunicados c
  WHERE public.calcular_status_campanha(c.data_inicio, c.data_fim) = 'ativo'
    AND (
      public.has_role(auth.uid(), 'admin_master')
      OR c.company_id = public.get_my_company_id()
    )
  ORDER BY c.data_inicio DESC, c.created_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.listar_denuncias_admin()
 RETURNS TABLE(id uuid, titulo text, mensagem text, status text, criado_em timestamp with time zone, anonimo boolean, user_id uuid, autor_nome text, tipo text, categoria_comportamento text, origem_ofensa text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_role app_role;
  v_company uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = v_user LIMIT 1;
  IF v_role NOT IN ('admin_master','admin_empresa','analista_rh') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;

  RETURN QUERY
  SELECT
    d.id,
    d.titulo,
    d.mensagem,
    d.status,
    d.criado_em,
    d.anonimo,
    CASE WHEN d.anonimo THEN NULL ELSE d.user_id END AS user_id,
    CASE WHEN d.anonimo THEN NULL ELSE (SELECT c.nome_completo FROM public.colaboradores c WHERE c.user_id = d.user_id LIMIT 1) END AS autor_nome,
    d.tipo,
    d.categoria_comportamento,
    d.origem_ofensa
  FROM public.denuncias d
  WHERE v_role = 'admin_master' OR d.company_id = v_company
  ORDER BY d.criado_em DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.marcar_ferias_gozadas(p_gozo_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_my_company uuid;
  v_gozo RECORD;
BEGIN
  v_role := get_my_role();
  v_my_company := get_my_company_id();
  
  SELECT g.*, c.company_id as col_company_id
  INTO v_gozo
  FROM ferias_gozo g
  JOIN colaboradores c ON c.id = g.colaborador_id
  WHERE g.id = p_gozo_id;
  
  IF v_gozo IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;
  
  IF v_role = 'admin_master' THEN
    NULL;
  ELSIF v_role IN ('admin_empresa','analista_rh') AND v_gozo.col_company_id = v_my_company THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  
  UPDATE ferias_gozo SET status='gozado', updated_at=now() WHERE id = p_gozo_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_admin_notification_read(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.admin_notifications
    SET is_read = true, read_at = now()
    WHERE id = p_id AND is_read = false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_admin_notifications_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.admin_notifications
    SET is_read = true, read_at = now()
    WHERE is_read = false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid()
    AND company_id = get_my_company_id()
    AND is_read = false;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.minuto_epoch(ts timestamp with time zone)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT (EXTRACT(EPOCH FROM ts AT TIME ZONE 'UTC')::bigint) / 60 $function$
;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.my_company_status()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT c.status::text
  FROM public.profiles p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.normalizar_tipo_ponto_registro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.tipo::text = 'INTERVALO_SAIDA' THEN
    NEW.tipo := 'SAIDA'::public.ponto_registro_tipo;
  ELSIF NEW.tipo::text = 'INTERVALO_RETORNO' THEN
    NEW.tipo := 'ENTRADA'::public.ponto_registro_tipo;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_autoavaliacao_concluida_pdi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_ciclo_nome TEXT;
BEGIN
  IF NEW.status_autoavaliacao = 'concluida' AND OLD.status_autoavaliacao != 'concluida' THEN
    IF NOT EXISTS (SELECT 1 FROM pdis WHERE avaliacao_id = NEW.id) THEN
      SELECT c.user_id, c.company_id INTO v_user_id, v_company_id
      FROM colaboradores c WHERE c.id = NEW.colaborador_id;

      SELECT nome_ciclo INTO v_ciclo_nome
      FROM ciclos_avaliacao WHERE id = NEW.ciclo_id;

      IF v_user_id IS NOT NULL THEN
        INSERT INTO notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
        VALUES (
          v_company_id, v_user_id, 'pdi', 'Crie seu PDI',
          'Sua autoavaliação do ciclo "' || COALESCE(v_ciclo_nome, 'Avaliação') || '" foi concluída. Crie seu Plano de Desenvolvimento Individual.',
          '/avaliacoes', 'pdi', NEW.id, 'normal'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_avaliacao_criada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_ciclo_nome TEXT;
  v_ciclo_status TEXT;
BEGIN
  SELECT c.user_id, c.company_id INTO v_user_id, v_company_id
  FROM colaboradores c WHERE c.id = NEW.colaborador_id;

  SELECT nome_ciclo, status INTO v_ciclo_nome, v_ciclo_status
  FROM ciclos_avaliacao WHERE id = NEW.ciclo_id;

  -- Only notify if cycle is active
  IF v_user_id IS NOT NULL AND v_ciclo_status = 'ativo' THEN
    INSERT INTO notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (
      v_company_id,
      v_user_id,
      'avaliacao',
      'Nova Avaliação de Desempenho',
      'O ciclo "' || COALESCE(v_ciclo_nome, 'Avaliação') || '" está disponível para você responder.',
      '/avaliacoes',
      'avaliacao',
      NEW.id,
      'high'
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_new_contact_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, data)
  VALUES (
    'contact_request',
    'Nova solicitação de demonstração',
    NEW.name || ' — ' || NEW.company || ' (' || NEW.email || ')',
    jsonb_build_object(
      'contact_request_id', NEW.id,
      'name', NEW.name,
      'company', NEW.company,
      'email', NEW.email,
      'phone', NEW.phone,
      'message', NEW.message
    )
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_questionario_atribuido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_user uuid; v_company uuid; v_titulo text;
BEGIN
  SELECT c.user_id, c.company_id INTO v_user, v_company FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;
  SELECT d.titulo INTO v_titulo FROM public.descricao_questionario dq JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id WHERE dq.id = NEW.descricao_questionario_id;
  IF v_user IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (v_company, v_user, 'questionario_cargo', 'Você tem um questionário para responder',
      'Questionário de descrição de cargo: ' || COALESCE(v_titulo,''), '/minhas-atividades', 'questionario_atribuicao', NEW.id, 'high');
  END IF;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.notify_questionario_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_titulo text; v_nome text; v_colab_user uuid; r record;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT d.company_id, d.titulo INTO v_company, v_titulo
  FROM public.descricao_questionario dq JOIN public.descricoes_cargo d ON d.id = dq.descricao_cargo_id
  WHERE dq.id = NEW.descricao_questionario_id;
  SELECT c.full_name, c.user_id INTO v_nome, v_colab_user FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;

  IF NEW.status = 'preenchido' THEN
    FOR r IN
      SELECT DISTINCT p.id AS user_id
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.company_id = v_company AND ur.role IN ('admin_empresa','analista_rh')
    LOOP
      INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
      VALUES (v_company, r.user_id, 'questionario_cargo_preenchido', 'Questionário preenchido',
        COALESCE(v_nome,'Colaborador') || ' respondeu o questionário de ' || COALESCE(v_titulo,'descrição de cargo'),
        '/estrutura-organizacional', 'questionario_atribuicao', NEW.id, 'normal');
    END LOOP;
  ELSIF OLD.status = 'preenchido' AND NEW.status = 'em_andamento' AND v_colab_user IS NOT NULL THEN
    INSERT INTO public.notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
    VALUES (v_company, v_colab_user, 'questionario_cargo', 'Questionário reaberto',
      'O RH reabriu o questionário de ' || COALESCE(v_titulo,'descrição de cargo') || ' para ajustes.',
      '/minhas-atividades', 'questionario_atribuicao', NEW.id, 'high');
  END IF;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.nr1_assert_ghe_company(p_ghe_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.ghes WHERE id = p_ghe_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'GHE não encontrado' USING ERRCODE = '22023';
  END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: GHE de outra empresa' USING ERRCODE = '42501';
  END IF;
  RETURN v_company;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_delete_risco_ghe(p_risco_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_ghe uuid;
BEGIN
  PERFORM public.require_admin_role();
  SELECT ghe_id INTO v_ghe FROM public.nr1_ghe_riscos WHERE id = p_risco_id;
  IF v_ghe IS NULL THEN RAISE EXCEPTION 'Risco não encontrado' USING ERRCODE='22023'; END IF;
  PERFORM public.nr1_assert_ghe_company(v_ghe);
  UPDATE public.nr1_ghe_riscos SET ativo = false WHERE id = p_risco_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_get_matriz(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_res jsonb;
BEGIN
  PERFORM public.require_admin_role();
  v_company := COALESCE(p_company_id, public.get_my_company_id());
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT COALESCE(jsonb_agg(y ORDER BY y.ghe_nome), '[]'::jsonb) INTO v_res
  FROM (
    SELECT g.id AS ghe_id, g.nome AS ghe_nome, g.codigo AS ghe_codigo,
           COALESCE((
             SELECT jsonb_agg(z ORDER BY z.nivel_risco DESC, z.nome_risco) FROM (
               SELECT r.id, r.nome_risco, r.categoria, r.probabilidade, r.severidade,
                      r.nivel_risco, r.fonte, r.origem_dados, r.descricao, r.controles_existentes
               FROM public.nr1_ghe_riscos r
               WHERE r.ghe_id = g.id AND r.ativo
             ) z), '[]'::jsonb) AS riscos
    FROM public.ghes g
    WHERE (v_company IS NULL OR g.company_id = v_company) AND g.ativo
  ) y;
  RETURN v_res;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_get_matriz_config(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_row public.nr1_matriz_config%ROWTYPE;
BEGIN
  PERFORM public.require_admin_role();
  v_company := COALESCE(p_company_id, public.get_my_company_id());
  IF v_company IS NULL THEN RAISE EXCEPTION 'Empresa não definida' USING ERRCODE='22023'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_row FROM public.nr1_matriz_config WHERE company_id = v_company;
  IF NOT FOUND THEN
    INSERT INTO public.nr1_matriz_config (company_id) VALUES (v_company) RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'company_id', v_row.company_id,
    'corte_verde', v_row.corte_verde, 'corte_amarelo', v_row.corte_amarelo,
    'corte_laranja', v_row.corte_laranja, 'corte_vermelho', v_row.corte_vermelho
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_get_matriz_por_ghe(p_ghe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_res jsonb;
BEGIN
  PERFORM public.require_admin_role();
  PERFORM public.nr1_assert_ghe_company(p_ghe_id);

  SELECT COALESCE(jsonb_agg(x ORDER BY x.nivel_risco DESC, x.nome_risco), '[]'::jsonb) INTO v_res
  FROM (
    SELECT r.id, r.ghe_id, r.risco_id, r.nome_risco, r.categoria, r.probabilidade, r.severidade,
           r.nivel_risco, r.fonte, r.origem_dados, r.descricao, r.controles_existentes,
           g.nome AS ghe_nome, g.codigo AS ghe_codigo, r.created_at
    FROM public.nr1_ghe_riscos r
    JOIN public.ghes g ON g.id = r.ghe_id
    WHERE r.ghe_id = p_ghe_id AND r.ativo
  ) x;
  RETURN v_res;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_save_matriz_config(p_company_id uuid, p_config jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_row public.nr1_matriz_config%ROWTYPE;
BEGIN
  PERFORM public.require_admin_role();
  v_company := COALESCE(p_company_id, public.get_my_company_id());
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.nr1_matriz_config (company_id, corte_verde, corte_amarelo, corte_laranja, corte_vermelho)
  VALUES (
    v_company,
    COALESCE((p_config->>'corte_verde')::int, 4),
    COALESCE((p_config->>'corte_amarelo')::int, 9),
    COALESCE((p_config->>'corte_laranja')::int, 14),
    COALESCE((p_config->>'corte_vermelho')::int, 25)
  )
  ON CONFLICT (company_id) DO UPDATE SET
    corte_verde = EXCLUDED.corte_verde,
    corte_amarelo = EXCLUDED.corte_amarelo,
    corte_laranja = EXCLUDED.corte_laranja,
    corte_vermelho = EXCLUDED.corte_vermelho
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id, 'company_id', v_row.company_id,
    'corte_verde', v_row.corte_verde, 'corte_amarelo', v_row.corte_amarelo,
    'corte_laranja', v_row.corte_laranja, 'corte_vermelho', v_row.corte_vermelho
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_save_risco_ghe(p_ghe_id uuid, p_risco_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_id uuid;
BEGIN
  PERFORM public.require_admin_role();
  v_company := public.nr1_assert_ghe_company(p_ghe_id);

  v_id := NULLIF(p_risco_data->>'id','')::uuid;

  IF v_id IS NOT NULL THEN
    UPDATE public.nr1_ghe_riscos SET
      risco_id = NULLIF(p_risco_data->>'risco_id','')::uuid,
      nome_risco = COALESCE(p_risco_data->>'nome_risco', nome_risco),
      categoria = COALESCE(p_risco_data->>'categoria', categoria),
      probabilidade = COALESCE((p_risco_data->>'probabilidade')::int, probabilidade),
      severidade = COALESCE((p_risco_data->>'severidade')::int, severidade),
      fonte = COALESCE(p_risco_data->>'fonte', fonte),
      origem_dados = p_risco_data->>'origem_dados',
      descricao = p_risco_data->>'descricao',
      controles_existentes = p_risco_data->>'controles_existentes'
    WHERE id = v_id AND ghe_id = p_ghe_id AND company_id = v_company;
    IF NOT FOUND THEN RAISE EXCEPTION 'Risco não encontrado' USING ERRCODE='22023'; END IF;
  ELSE
    INSERT INTO public.nr1_ghe_riscos (
      company_id, ghe_id, risco_id, nome_risco, categoria, probabilidade, severidade,
      fonte, origem_dados, descricao, controles_existentes
    ) VALUES (
      v_company, p_ghe_id,
      NULLIF(p_risco_data->>'risco_id','')::uuid,
      p_risco_data->>'nome_risco',
      p_risco_data->>'categoria',
      COALESCE((p_risco_data->>'probabilidade')::int, 3),
      COALESCE((p_risco_data->>'severidade')::int, 3),
      COALESCE(p_risco_data->>'fonte', 'manual'),
      p_risco_data->>'origem_dados',
      p_risco_data->>'descricao',
      p_risco_data->>'controles_existentes'
    ) RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_sugerir_riscos(p_ghe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_company uuid; v_res jsonb;
BEGIN
  PERFORM public.require_admin_role();
  v_company := public.nr1_assert_ghe_company(p_ghe_id);

  WITH textos AS (
    SELECT 'tarefa_prescrita'::text AS campo, c.nome AS origem, c.tarefa_prescrita AS txt
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.tarefa_prescrita IS NOT NULL
    UNION ALL
    SELECT 'tarefa_real', c.nome, c.tarefa_real
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.tarefa_real IS NOT NULL
    UNION ALL
    SELECT 'descricao_atividades', c.nome, c.descricao_atividades
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.descricao_atividades IS NOT NULL
    UNION ALL
    SELECT 'cbo_descricao', c.nome, c.cbo_descricao
      FROM public.cargos c WHERE c.ghe_id = p_ghe_id AND c.cbo_descricao IS NOT NULL
    UNION ALL
    SELECT 'ambiente_fisico', s.nome, s.ambiente_fisico
      FROM public.ghes g JOIN public.setores s ON s.id = g.setor_id
      WHERE g.id = p_ghe_id AND s.ambiente_fisico IS NOT NULL
  ),
  regras AS (
    SELECT rg.id, rg.risco_catalogo_id, rg.campo_busca, rg.probabilidade_sugerida, rg.severidade_sugerida,
           trim(both from pal) AS palavra
    FROM public.nr1_regras_sugestao rg
    CROSS JOIN LATERAL unnest(string_to_array(COALESCE(rg.palavras_chave,''), ',')) AS pal
    WHERE rg.ativo AND trim(both from pal) <> ''
  ),
  matches AS (
    SELECT r.risco_catalogo_id,
           max(r.probabilidade_sugerida) AS probabilidade,
           max(r.severidade_sugerida) AS severidade,
           string_agg(DISTINCT format('"%s" em %s (%s)', r.palavra, t.campo, t.origem), '; ') AS motivo
    FROM regras r
    JOIN textos t ON t.campo = r.campo_busca AND t.txt ILIKE '%' || r.palavra || '%'
    GROUP BY r.risco_catalogo_id
  )
  SELECT COALESCE(jsonb_agg(x ORDER BY x.categoria, x.nome), '[]'::jsonb) INTO v_res
  FROM (
    SELECT cat.id AS risco_catalogo_id, cat.nome, cat.categoria,
           m.probabilidade, m.severidade,
           'Palavras-chave encontradas: ' || m.motivo AS origem_dados,
           m.motivo AS motivo_sugestao,
           EXISTS (
             SELECT 1 FROM public.nr1_ghe_riscos gr
             WHERE gr.ghe_id = p_ghe_id AND gr.ativo
               AND (gr.risco_id = cat.id OR lower(gr.nome_risco) = lower(cat.nome))
           ) AS ja_adicionado
    FROM matches m
    JOIN public.nr1_riscos_catalogo cat ON cat.id = m.risco_catalogo_id
    WHERE cat.ativo AND (cat.company_id IS NULL OR cat.company_id = v_company)
  ) x;

  RETURN v_res;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.nr1_sync_psicossociais(p_avaliacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company uuid; v_heat jsonb; v_linha jsonb; v_cel jsonb;
  v_indice numeric; v_risco numeric; v_tipo text; v_cm numeric; v_ca numeric;
  v_nivel text; v_p int; v_s int; v_ghe uuid; v_nome text; v_titulo text;
  v_criados int := 0; v_planos int := 0; v_novo uuid; v_instr text;
BEGIN
  PERFORM public.require_admin_role();
  SELECT a.company_id, i.nome INTO v_company, v_instr
  FROM public.psico_avaliacoes a
  LEFT JOIN public.psico_instrumentos i ON i.id = a.instrumento_id
  WHERE a.id = p_avaliacao_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada' USING ERRCODE='22023'; END IF;
  IF NOT (public.is_admin_master(auth.uid()) OR v_company = public.get_my_company_id()) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  v_heat := public.psico_get_heatmap(p_avaliacao_id, 'ghe');

  FOR v_linha IN SELECT * FROM jsonb_array_elements(COALESCE(v_heat->'linhas','[]'::jsonb)) LOOP
    v_ghe := NULLIF(v_linha->>'grupo_id','')::uuid;
    CONTINUE WHEN v_ghe IS NULL;

    FOR v_cel IN SELECT * FROM jsonb_array_elements(COALESCE(v_linha->'celulas','[]'::jsonb)) LOOP
      v_indice := NULLIF(v_cel->>'indice','')::numeric;
      CONTINUE WHEN v_indice IS NULL;
      v_tipo := COALESCE(v_cel->>'tipo_dimensao','negativa');
      v_cm := COALESCE((v_cel->>'corte_medio')::numeric, 40);
      v_ca := COALESCE((v_cel->>'corte_alto')::numeric, 60);
      v_risco := CASE WHEN v_tipo = 'positiva' THEN 100 - v_indice ELSE v_indice END;
      IF v_tipo = 'positiva' THEN
        v_nivel := CASE WHEN v_indice < v_cm THEN 'Vermelho' WHEN v_indice < v_ca THEN 'Laranja' ELSE 'Verde' END;
      ELSE
        v_nivel := CASE WHEN v_indice >= v_ca THEN 'Vermelho' WHEN v_indice >= v_cm THEN 'Laranja' ELSE 'Verde' END;
      END IF;
      CONTINUE WHEN v_nivel = 'Verde';

      IF v_risco >= 90 THEN v_p := 5; v_s := 5;
      ELSIF v_risco >= 75 THEN v_p := 4; v_s := 5;
      ELSE v_p := 4; v_s := 4;
      END IF;

      v_nome := v_cel->>'dimensao';
      IF EXISTS (
        SELECT 1 FROM public.nr1_ghe_riscos r
        WHERE r.ghe_id = v_ghe AND r.ativo AND r.categoria = 'psicossocial'
          AND lower(r.nome_risco) = lower(v_nome)
      ) THEN CONTINUE; END IF;

      INSERT INTO public.nr1_ghe_riscos (
        company_id, ghe_id, nome_risco, categoria, probabilidade, severidade,
        fonte, origem_dados, descricao
      ) VALUES (
        v_company, v_ghe, v_nome, 'psicossocial', v_p, v_s, 'psicossocial',
        format('Heatmap %s - %s: índice %s (%s)', COALESCE(v_instr,'instrumento'), v_nome, v_indice, v_nivel),
        format('Risco psicossocial identificado na campanha psicossocial (grupo %s).', v_linha->>'grupo_nome')
      ) RETURNING id INTO v_novo;
      v_criados := v_criados + 1;

      v_titulo := format('%s - %s', v_nome, v_linha->>'grupo_nome');
      IF NOT EXISTS (
        SELECT 1 FROM public.nr1_planos_acao pa
        WHERE pa.avaliacao_id = p_avaliacao_id
          AND pa.grupo_tipo = 'ghe' AND pa.grupo_id = v_ghe
          AND pa.dimensao_id = NULLIF(v_cel->>'dimensao_id','')::uuid
      ) THEN
        INSERT INTO public.nr1_planos_acao (
          company_id, origem, avaliacao_id, dimensao_id, dimensao_nome,
          grupo_tipo, grupo_id, grupo_nome, indice, media, nivel_risco,
          titulo, descricao, status, criado_por
        ) VALUES (
          v_company, 'automatico', p_avaliacao_id,
          NULLIF(v_cel->>'dimensao_id','')::uuid, v_nome,
          'ghe', v_ghe, v_linha->>'grupo_nome',
          v_indice, NULLIF(v_cel->>'media','')::numeric, v_nivel,
          v_titulo,
          format('Plano gerado pela Matriz de Risco a partir do risco psicossocial "%s" (nível %s).', v_nome, v_nivel),
          'pendente', auth.uid()
        );
        v_planos := v_planos + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('riscos_criados', v_criados, 'planos_criados', v_planos);
END;
$function$
;
