-- Migration: 20261009171000_cuidar_drilldown.sql
-- Criação da RPC get_cuidar_drilldown para detalhamento (com PII tracking/mascaramento baseado no papel)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cuidar_drilldown_result') THEN
    CREATE TYPE public.cuidar_drilldown_result AS (
      gestor_id UUID,
      casos JSONB
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_cuidar_drilldown(p_company_id UUID)
RETURNS SETOF public.cuidar_drilldown_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role app_role;
  v_is_admin BOOLEAN;
BEGIN
  v_role := public.get_my_role();

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  -- Regra de negócio: somente admin_master e admin_empresa veem PII
  IF v_role IN ('admin_master', 'admin_empresa') THEN
    v_is_admin := TRUE;
  ELSIF v_role IN ('analista_rh', 'gestor_departamento', 'colaborador') THEN
    v_is_admin := FALSE;
  ELSE
    RETURN;
  END IF;

  -- Segurança multi-tenant
  IF v_role != 'admin_master' AND p_company_id != public.get_my_company_id() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH raw_data AS (
    SELECT 
      a.responsavel_id as gestor_id,
      a.status,
      a.created_at,
      CASE 
        WHEN a.status IN ('novo', 'em_andamento') AND a.proximo_contato_em < CURRENT_DATE THEN true
        WHEN a.status = 'novo' AND a.created_at < NOW() - INTERVAL '7 days' THEN true
        ELSE false
      END as is_atrasado,
      EXTRACT(EPOCH FROM (NOW() - a.created_at))/86400 as dias_decorridos,
      CASE WHEN a.pulse_response_id IS NOT NULL THEN 'campanha' ELSE 'pulso_direto' END as origem,
      -- PII Data
      c.full_name as colaborador_nome,
      COALESCE(pr.resposta, ps.score::text) as resposta_texto,
      COALESCE(pr.created_at, ps.created_at) as data_resposta
    FROM public.pulse_acompanhamentos a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
    LEFT JOIN public.pulse_responses pr ON pr.id = a.pulse_response_id
    LEFT JOIN public.pulse_surveys ps ON ps.id = a.resposta_id
    WHERE a.company_id = p_company_id
      AND (v_is_admin OR a.responsavel_id = auth.uid())
  )
  SELECT 
    r.gestor_id,
    jsonb_agg(
      jsonb_build_object(
        'status', r.status,
        'is_atrasado', r.is_atrasado,
        'dias_decorridos', TRUNC(r.dias_decorridos::numeric, 1),
        'origem', r.origem,
        'colaborador_nome', CASE WHEN v_is_admin THEN r.colaborador_nome ELSE 'Colaborador Oculto' END,
        'resposta_texto', CASE WHEN v_is_admin THEN r.resposta_texto ELSE '***' END,
        'data_resposta', CASE WHEN v_is_admin THEN r.data_resposta ELSE NULL END
      ) ORDER BY r.created_at ASC
    ) as casos
  FROM raw_data r
  GROUP BY r.gestor_id;
END;
$$;
