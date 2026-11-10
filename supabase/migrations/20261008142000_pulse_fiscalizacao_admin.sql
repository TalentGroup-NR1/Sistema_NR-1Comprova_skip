-- Migration: 20261008142000_pulse_fiscalizacao_admin.sql
-- Etapa 4 do Cuidar+: Painel de Fiscalização do Admin (Cobrança por Gestor)
-- Idempotente (IF NOT EXISTS, CREATE OR REPLACE, ON CONFLICT DO NOTHING)

-- 1. Tipo de retorno da RPC de fiscalização
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pulse_fiscalizacao_result') THEN
    CREATE TYPE public.pulse_fiscalizacao_result AS (
      gestor_id UUID,
      gestor_nome TEXT,
      qtd_novo INT,
      qtd_em_andamento INT,
      qtd_atrasado INT,
      ultimos_acompanhamentos JSONB
    );
  END IF;
END $$;

-- 2. RPC get_pulse_fiscalizacao(p_company_id)
-- Regras obrigatórias:
-- - SECURITY DEFINER com search_path = 'public'
-- - Fail-closed no topo do BEGIN:
--   v_role := get_my_role();
--   SE v_role NOT IN ('admin_master','admin_empresa','analista_rh') -> RETURN (vazio);
--   SE v_role IN ('admin_empresa','analista_rh') E p_company_id != get_my_company_id() -> RETURN (vazio);
-- - Retorno agregado por gestor (sem PII de colaborador)
-- - Atrasado: status IN ('novo','em_andamento') AND (proximo_contato_em < CURRENT_DATE OR (status='novo' AND created_at < NOW() - INTERVAL '7 days'))
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

  -- Validação Fail-Closed: Somente admins e analistas de RH podem executar
  IF v_role IS NULL OR v_role NOT IN ('admin_master', 'admin_empresa', 'analista_rh') THEN
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
      COALESCE(g.full_name, 'Gestor Não Identificado') as gestor_nome,
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
      ad.gestor_id,
      MAX(ad.gestor_nome) as gestor_nome,
      COUNT(*) FILTER (WHERE ad.status = 'novo')::INT as qtd_novo,
      COUNT(*) FILTER (WHERE ad.status = 'em_andamento')::INT as qtd_em_andamento,
      COUNT(*) FILTER (WHERE ad.is_atrasado = true)::INT as qtd_atrasado,
      jsonb_agg(
        jsonb_build_object(
          'status', ad.status,
          'created_at', ad.created_at,
          'iniciado_em', ad.iniciado_em,
          'encerrado_em', ad.encerrado_em,
          'is_atrasado', ad.is_atrasado
        ) ORDER BY ad.created_at DESC
      ) as ultimos_acompanhamentos
    FROM acompanhamentos_dados ad
    GROUP BY ad.gestor_id
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
