-- Adiciona a coluna esferas_identificadas na RPC get_pulse_colaboradores_list
DROP FUNCTION IF EXISTS get_pulse_colaboradores_list(UUID, TEXT);

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
  ultima_resposta TIMESTAMPTZ,
  esferas_identificadas TEXT[]
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
    MAX(pr.created_at) as ultima_resposta,
    ARRAY_AGG(DISTINCT pr.esfera) FILTER (WHERE pr.esfera IS NOT NULL) as esferas_identificadas
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
