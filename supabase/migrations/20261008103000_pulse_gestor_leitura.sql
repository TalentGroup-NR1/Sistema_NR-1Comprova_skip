-- Migration Etapa 1 do Cuidar+ (Gestor): Leitura do pulso da equipe

DROP FUNCTION IF EXISTS public.get_pulse_campaign_results(uuid, text, text, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.get_pulse_campaign_results(uuid, text, integer, integer, integer, integer);

-- get_pulse_campaign_results
CREATE OR REPLACE FUNCTION public.get_pulse_campaign_results(
  p_campaign_id uuid,
  p_department text DEFAULT NULL::text,
  p_min_score integer DEFAULT NULL::integer,
  p_max_score integer DEFAULT NULL::integer,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
  response_id uuid,
  question_id uuid,
  pergunta text,
  tipo text,
  resposta text,
  resposta_numerica integer,
  comentario text,
  employee_id uuid,
  colaborador_nome text,
  departamento character varying,
  created_at timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
  v_admin_id UUID;
  v_is_admin_master BOOLEAN;
  v_my_role TEXT;
  v_gestor_id UUID;
BEGIN
  v_my_role := public.get_my_role()::TEXT;
  IF v_my_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento') THEN
    RETURN; -- Fail-closed
  END IF;
  
  v_is_admin_master := v_my_role = 'admin_master';
  v_company_id := public.get_my_company_id();
  v_admin_id := auth.uid();
  
  IF v_my_role = 'gestor_departamento' THEN
    v_gestor_id := public.get_my_colaborador_id();
    IF v_gestor_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

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
    'role', v_my_role,
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
    c.full_name::TEXT as colaborador_nome,
    c.department as departamento,
    pr.created_at
  FROM public.pulse_responses pr
  JOIN public.pulse_questions pq ON pq.id = pr.question_id
  JOIN public.colaboradores c ON c.id = pr.employee_id
  WHERE pr.campaign_id = p_campaign_id
    AND (v_my_role != 'gestor_departamento' OR c.gestor_id = v_gestor_id)
    AND (p_department IS NULL OR c.department = p_department)
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
$function$;

-- get_pulse_dashboard
CREATE OR REPLACE FUNCTION public.get_pulse_dashboard(p_company_id uuid, p_year integer DEFAULT (EXTRACT(year FROM now()))::integer, p_weeks_back integer DEFAULT 4)
 RETURNS TABLE(week_number integer, year integer, total_responses bigint, avg_score numeric, score_0 bigint, score_1 bigint, score_2 bigint, score_3 bigint, score_4 bigint, score_5 bigint, comments_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_week INTEGER;
  v_my_role TEXT;
  v_gestor_id UUID;
BEGIN
  v_my_role := public.get_my_role()::TEXT;
  IF v_my_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento') THEN
    RETURN;
  END IF;

  IF v_my_role = 'gestor_departamento' THEN
    v_gestor_id := public.get_my_colaborador_id();
    IF v_gestor_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

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
    AND (v_my_role != 'gestor_departamento' OR ps.employee_id IN (SELECT id FROM public.colaboradores WHERE gestor_id = v_gestor_id))
    AND ps.year = p_year
    AND ps.week_number >= (current_week - p_weeks_back)
    AND ps.week_number <= current_week
  GROUP BY ps.week_number, ps.year
  ORDER BY ps.year DESC, ps.week_number DESC;
END;
$function$;
