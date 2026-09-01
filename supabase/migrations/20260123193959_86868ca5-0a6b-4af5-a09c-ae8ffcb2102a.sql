-- Primeiro dropar as funções para recriar com novos parâmetros
DROP FUNCTION IF EXISTS public.get_pulse_campaign_stats(uuid);
DROP FUNCTION IF EXISTS public.get_pulse_campaign_results(uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_pending_pulse_respondents(uuid);

-- Corrigir função get_pulse_campaign_stats: 'ativo' -> 'ATIVO'
CREATE OR REPLACE FUNCTION public.get_pulse_campaign_stats(p_campaign_id uuid)
RETURNS TABLE(
  total_responses bigint,
  avg_score numeric,
  participation_rate numeric,
  score_distribution jsonb,
  ambiente_breakdown jsonb,
  department_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  SELECT company_id INTO v_campaign_company_id
  FROM public.pulse_campaigns
  WHERE id = p_campaign_id;
  
  -- CORREÇÃO CRÍTICA: Usar 'ATIVO' em vez de 'ativo'
  SELECT COUNT(DISTINCT id) INTO v_total_colaboradores
  FROM public.colaboradores
  WHERE company_id = v_campaign_company_id AND status = 'ATIVO';
  
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
      SELECT jsonb_object_agg(ambiente, count)
      FROM (
        SELECT pr2.ambiente::TEXT, COUNT(DISTINCT pr2.employee_id) as count
        FROM public.pulse_responses pr2
        WHERE pr2.campaign_id = p_campaign_id
        GROUP BY pr2.ambiente
      ) a
    ) as ambiente_breakdown,
    (
      SELECT jsonb_object_agg(department, avg_score)
      FROM (
        SELECT c2.department, ROUND(AVG(pr2.resposta::NUMERIC), 2) as avg_score
        FROM public.pulse_responses pr2
        JOIN public.pulse_questions pq2 ON pq2.id = pr2.question_id
        JOIN public.colaboradores c2 ON c2.id = pr2.employee_id
        WHERE pr2.campaign_id = p_campaign_id AND pq2.tipo = 'escala_0_5'
        GROUP BY c2.department
      ) d
    ) as department_breakdown
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE pr.campaign_id = p_campaign_id;
END;
$$;

-- Corrigir função get_pending_pulse_respondents: 'ativo' -> 'ATIVO'
CREATE OR REPLACE FUNCTION public.get_pending_pulse_respondents(p_company_id uuid)
RETURNS TABLE(colaborador_id uuid, full_name text, corporate_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Recriar get_pulse_campaign_results com paginação no servidor
CREATE OR REPLACE FUNCTION public.get_pulse_campaign_results(
  p_campaign_id uuid,
  p_department text DEFAULT NULL,
  p_ambiente text DEFAULT NULL,
  p_min_score integer DEFAULT NULL,
  p_max_score integer DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  response_id uuid,
  question_id uuid,
  pergunta text,
  resposta text,
  resposta_numerica integer,
  comentario text,
  ambiente text,
  colaborador_nome text,
  departamento text,
  created_at timestamptz,
  is_anonymous boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Verificar se campanha existe (admin_master pode ver qualquer uma)
  IF v_is_admin_master THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pulse_campaigns WHERE id = p_campaign_id
    ) THEN
      RAISE EXCEPTION 'Campanha não encontrada';
    END IF;
  ELSE
    -- Outros admins só veem campanhas da sua empresa
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
      'ambiente', p_ambiente,
      'min_score', p_min_score,
      'max_score', p_max_score
    )
  ));
  
  RETURN QUERY
  SELECT 
    pr.id as response_id,
    pr.question_id,
    pq.pergunta,
    pr.resposta,
    CASE 
      WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::INTEGER
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 5
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'nao' THEN 0
      ELSE NULL
    END as resposta_numerica,
    pr.comentario,
    pr.ambiente::TEXT,
    -- Privacidade condicional: anônimo se score >= 3
    CASE 
      WHEN pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= 3 THEN 'Anônimo'
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN 'Anônimo'
      WHEN pq.tipo = 'texto_livre' THEN 'Anônimo'
      ELSE c.full_name::TEXT
    END as colaborador_nome,
    c.department as departamento,
    pr.created_at,
    CASE 
      WHEN pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= 3 THEN true
      WHEN pq.tipo = 'sim_nao' AND pr.resposta = 'sim' THEN true
      WHEN pq.tipo = 'texto_livre' THEN true
      ELSE false
    END as is_anonymous
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE pr.campaign_id = p_campaign_id
    AND (p_department IS NULL OR c.department = p_department)
    AND (p_ambiente IS NULL OR pr.ambiente::TEXT = p_ambiente)
    AND (
      p_min_score IS NULL 
      OR (pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER >= p_min_score)
    )
    AND (
      p_max_score IS NULL 
      OR (pq.tipo = 'escala_0_5' AND pr.resposta::INTEGER <= p_max_score)
    )
  ORDER BY pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_pulse_responses_created_at_desc 
ON public.pulse_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_responses_campaign_ambiente 
ON public.pulse_responses(campaign_id, ambiente);