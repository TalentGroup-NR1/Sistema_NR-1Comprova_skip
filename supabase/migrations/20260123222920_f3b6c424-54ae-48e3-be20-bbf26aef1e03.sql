
-- Corrigir a função get_pulse_colaboradores_list com os nomes corretos das colunas
CREATE OR REPLACE FUNCTION get_pulse_colaboradores_list(
  p_company_id UUID,
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
  employee_id UUID,
  nome TEXT,
  departamento VARCHAR,
  cargo VARCHAR,
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
$$;

-- Corrigir a função get_employee_pulse_history com os nomes corretos das colunas
CREATE OR REPLACE FUNCTION get_employee_pulse_history(
  p_employee_id UUID
)
RETURNS TABLE (
  response_id UUID,
  campaign_id UUID,
  campaign_title VARCHAR,
  question_id UUID,
  question_texto TEXT,
  question_tipo VARCHAR,
  resposta TEXT,
  comentario TEXT,
  response_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_role TEXT;
BEGIN
  -- Obter company_id do colaborador
  SELECT c.company_id INTO v_company_id
  FROM colaboradores c
  WHERE c.id = p_employee_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  -- Verificar permissão
  v_role := public.get_my_role();
  
  IF v_role = 'admin_master' THEN
    -- Admin master tem acesso a tudo
    NULL;
  ELSIF v_role IN ('admin_empresa', 'analista_rh') THEN
    -- Verificar se pertence à mesma empresa
    IF v_company_id != public.get_my_company_id() THEN
      RAISE EXCEPTION 'Acesso negado: colaborador de outra empresa';
    END IF;
  ELSE
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id as response_id,
    pc.id as campaign_id,
    pc.titulo as campaign_title,
    pq.id as question_id,
    pq.texto as question_texto,
    pq.tipo as question_tipo,
    pr.resposta,
    pr.comentario,
    pr.created_at as response_date
  FROM pulse_responses pr
  INNER JOIN pulse_questions pq ON pr.question_id = pq.id
  INNER JOIN pulse_campaigns pc ON pq.campaign_id = pc.id
  WHERE pr.employee_id = p_employee_id
  ORDER BY pr.created_at DESC, pq.ordem ASC;
END;
$$;
