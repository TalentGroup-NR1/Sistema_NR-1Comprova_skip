-- =====================================================
-- CORREÇÃO: Dropar funções existentes antes de recriar
-- =====================================================

-- Dropar funções com tipos de retorno diferentes
DROP FUNCTION IF EXISTS get_pulse_trend_data(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_pulse_campaign_results(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_my_pulse_campaign_history();
DROP FUNCTION IF EXISTS submit_pulse_campaign_response(UUID, JSONB, pulse_ambiente, TEXT);
DROP FUNCTION IF EXISTS get_pulse_campaign_stats(UUID);

-- =====================================================
-- PARTE 1: Remover coluna ambiente da tabela pulse_responses
-- =====================================================
ALTER TABLE pulse_responses DROP COLUMN IF EXISTS ambiente;

-- Criar índice para queries por colaborador (otimização)
CREATE INDEX IF NOT EXISTS idx_pulse_responses_employee_campaign 
ON pulse_responses(employee_id, campaign_id, created_at DESC);

-- Remover o enum pulse_ambiente se existir (não mais necessário)
-- DROP TYPE IF EXISTS pulse_ambiente; -- Comentado pois pode ter dependências

-- =====================================================
-- PARTE 2: Atualizar função submit_pulse_campaign_response
-- Remover parâmetro ambiente
-- =====================================================
CREATE OR REPLACE FUNCTION submit_pulse_campaign_response(
  p_campaign_id UUID,
  p_responses JSONB,
  p_comentario TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colaborador_id UUID;
  v_company_id UUID;
  v_response JSONB;
BEGIN
  -- Buscar colaborador do usuário atual
  SELECT id, company_id INTO v_colaborador_id, v_company_id
  FROM public.colaboradores
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF v_colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  
  -- Verificar se campanha está ativa
  IF NOT EXISTS (
    SELECT 1 FROM public.pulse_campaigns
    WHERE id = p_campaign_id
      AND company_id = v_company_id
      AND ativo = true
      AND CURRENT_DATE BETWEEN data_inicio AND data_fim
  ) THEN
    RAISE EXCEPTION 'Campanha não está ativa ou não existe';
  END IF;
  
  -- Verificar se já respondeu
  IF EXISTS (
    SELECT 1 FROM public.pulse_responses
    WHERE campaign_id = p_campaign_id AND employee_id = v_colaborador_id
  ) THEN
    RAISE EXCEPTION 'Você já respondeu esta campanha';
  END IF;
  
  -- Inserir respostas
  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    INSERT INTO public.pulse_responses (
      campaign_id, question_id, employee_id, resposta, comentario
    ) VALUES (
      p_campaign_id,
      (v_response->>'question_id')::UUID,
      v_colaborador_id,
      v_response->>'resposta',
      p_comentario
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- PARTE 3: Atualizar função get_pulse_campaign_results
-- Remover ambiente e lógica de anonimato (sempre mostrar nome)
-- =====================================================
CREATE OR REPLACE FUNCTION get_pulse_campaign_results(
  p_campaign_id UUID,
  p_department TEXT DEFAULT NULL,
  p_min_score INTEGER DEFAULT NULL,
  p_max_score INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  response_id UUID,
  question_id UUID,
  pergunta TEXT,
  tipo TEXT,
  resposta TEXT,
  resposta_numerica INTEGER,
  comentario TEXT,
  employee_id UUID,
  colaborador_nome TEXT,
  departamento character varying(100),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =====================================================
-- PARTE 4: Atualizar função get_pulse_trend_data
-- Remover ambiente_empresa_avg e ambiente_cliente_avg
-- =====================================================
CREATE OR REPLACE FUNCTION get_pulse_trend_data(
  p_company_id UUID,
  p_months_back INTEGER DEFAULT 6
)
RETURNS TABLE(
  campaign_id UUID,
  campaign_title TEXT,
  campaign_date DATE,
  avg_score NUMERIC,
  total_responses BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =====================================================
-- PARTE 5: Atualizar função get_my_pulse_campaign_history
-- Remover ambiente
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_pulse_campaign_history()
RETURNS TABLE(
  campaign_id UUID,
  titulo character varying(200),
  data_inicio DATE,
  data_fim DATE,
  responded_at TIMESTAMPTZ,
  responses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =====================================================
-- PARTE 6: Atualizar função get_pulse_campaign_stats
-- Remover ambiente_breakdown
-- =====================================================
CREATE OR REPLACE FUNCTION get_pulse_campaign_stats(p_campaign_id UUID)
RETURNS TABLE(
  total_responses BIGINT,
  avg_score NUMERIC,
  participation_rate NUMERIC,
  score_distribution JSONB,
  department_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =====================================================
-- PARTE 7: Criar função get_employee_pulse_history
-- Para visualização detalhada por colaborador
-- =====================================================
CREATE OR REPLACE FUNCTION get_employee_pulse_history(
  p_employee_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  campaign_id UUID,
  campaign_title TEXT,
  campaign_date DATE,
  question_id UUID,
  pergunta TEXT,
  tipo TEXT,
  resposta TEXT,
  resposta_numerica INTEGER,
  comentario TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =====================================================
-- PARTE 8: Criar função para listar colaboradores com métricas de pulso
-- =====================================================
CREATE OR REPLACE FUNCTION get_pulse_colaboradores_list(
  p_company_id UUID,
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE(
  employee_id UUID,
  nome TEXT,
  departamento character varying(100),
  cargo character varying(100),
  foto_url TEXT,
  total_respostas BIGINT,
  media_geral NUMERIC,
  ultima_resposta TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF public.get_my_role() NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as employee_id,
    c.nome,
    c.departamento,
    c.cargo,
    c.foto_url,
    COUNT(DISTINCT pr.id) as total_respostas,
    ROUND(AVG(
      CASE 
        WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
        WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 5
        WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'nao' THEN 0
        ELSE NULL
      END
    )::NUMERIC, 2) as media_geral,
    MAX(pr.created_at) as ultima_resposta
  FROM colaboradores c
  LEFT JOIN pulse_responses pr ON c.id = pr.employee_id
  LEFT JOIN pulse_questions pq ON pr.question_id = pq.id
  WHERE c.empresa_id = p_company_id
    AND c.status = 'ativo'
    AND (p_department IS NULL OR c.departamento = p_department)
  GROUP BY c.id, c.nome, c.departamento, c.cargo, c.foto_url
  ORDER BY c.nome ASC;
END;
$$;