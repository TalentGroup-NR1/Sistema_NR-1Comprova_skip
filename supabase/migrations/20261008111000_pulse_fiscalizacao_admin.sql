-- 1. Definir o tipo de retorno da RPC
DROP TYPE IF EXISTS public.pulse_fiscalizacao_result CASCADE;
CREATE TYPE public.pulse_fiscalizacao_result AS (
  gestor_id UUID,
  gestor_nome TEXT,
  qtd_novo INT,
  qtd_em_andamento INT,
  qtd_atrasado INT,
  ultimos_acompanhamentos JSONB
);

-- 2. Criar a RPC
CREATE OR REPLACE FUNCTION public.get_pulse_fiscalizacao(p_company_id UUID)
RETURNS SETOF public.pulse_fiscalizacao_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role app_role;
BEGIN
  v_role := public.get_my_role();

  -- Validação Fail-Closed: Somente admins podem executar
  IF v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
    RETURN;
  END IF;

  -- Segurança multi-tenant
  IF v_role IN ('admin_empresa', 'analista_rh') AND p_company_id != public.get_my_company_id() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH acompanhamentos_dados AS (
    SELECT 
      a.responsavel_id as gestor_id,
      g.full_name as gestor_nome,
      a.status,
      a.created_at,
      a.iniciado_em,
      a.encerrado_em,
      a.proximo_contato_em,
      CASE 
        WHEN a.status IN ('novo', 'em_andamento') AND a.proximo_contato_em < CURRENT_DATE THEN true
        WHEN a.status = 'novo' AND a.created_at < NOW() - INTERVAL '7 days' THEN true
        ELSE false
      END as is_atrasado
    FROM public.pulse_acompanhamentos a
    JOIN auth.users u ON u.id = a.responsavel_id
    JOIN public.colaboradores g ON g.user_id = u.id AND g.company_id = a.company_id
    WHERE a.company_id = p_company_id
  ),
  agrupado AS (
    SELECT 
      gestor_id,
      MAX(gestor_nome) as gestor_nome,
      COUNT(*) FILTER (WHERE status = 'novo')::INT as qtd_novo,
      COUNT(*) FILTER (WHERE status = 'em_andamento')::INT as qtd_em_andamento,
      COUNT(*) FILTER (WHERE is_atrasado = true)::INT as qtd_atrasado,
      jsonb_agg(
        jsonb_build_object(
          'status', status,
          'created_at', created_at,
          'iniciado_em', iniciado_em,
          'encerrado_em', encerrado_em,
          'is_atrasado', is_atrasado
        ) ORDER BY created_at DESC
      ) as ultimos_acompanhamentos
    FROM acompanhamentos_dados
    GROUP BY gestor_id
  )
  SELECT 
    ag.gestor_id,
    ag.gestor_nome,
    ag.qtd_novo,
    ag.qtd_em_andamento,
    ag.qtd_atrasado,
    (SELECT jsonb_agg(item) FROM (SELECT jsonb_array_elements(ag.ultimos_acompanhamentos) as item LIMIT 5) sub) as ultimos_acompanhamentos
  FROM agrupado ag;
END;
$$;
