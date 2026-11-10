-- Corrigir get_pulse_campaign_results: tipo VARCHAR(100) para departamento
DROP FUNCTION IF EXISTS public.get_pulse_campaign_results(uuid,text,text,integer,integer,integer,integer);

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
  departamento character varying(100),
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

-- Corrigir get_pulse_trend_data: remover ambiguidade de alias
DROP FUNCTION IF EXISTS public.get_pulse_trend_data(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_pulse_trend_data(
  p_company_id uuid, 
  p_months_back integer DEFAULT 6
)
RETURNS TABLE(
  campaign_id uuid, 
  titulo character varying, 
  data_inicio date, 
  avg_score numeric, 
  total_responses bigint, 
  ambiente_empresa_avg numeric, 
  ambiente_cliente_avg numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin_master BOOLEAN;
BEGIN
  v_is_admin_master := public.get_my_role() = 'admin_master';
  
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.titulo,
    c.data_inicio,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' THEN pr.resposta::NUMERIC ELSE NULL END
    ), 2) as calculated_avg_score,
    COUNT(DISTINCT pr.employee_id)::BIGINT as total_responses,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' AND pr.ambiente = 'empresa' THEN pr.resposta::NUMERIC ELSE NULL END
    ), 2) as ambiente_empresa_avg,
    ROUND(AVG(
      CASE WHEN pq.tipo = 'escala_0_5' AND pr.ambiente = 'cliente' THEN pr.resposta::NUMERIC ELSE NULL END
    ), 2) as ambiente_cliente_avg
  FROM public.pulse_campaigns c
  LEFT JOIN public.pulse_responses pr ON pr.campaign_id = c.id
  LEFT JOIN public.pulse_questions pq ON pq.id = pr.question_id
  WHERE (v_is_admin_master OR c.company_id = p_company_id)
    AND c.data_inicio >= CURRENT_DATE - (p_months_back || ' months')::INTERVAL
  GROUP BY c.id, c.titulo, c.data_inicio
  ORDER BY c.data_inicio ASC;
END;
$$;