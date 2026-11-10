-- ============================================================
-- Migration: 20261007200002_fix_get_colaboradores_seguro.sql
-- Fix get_colaboradores_seguro to be FAIL-CLOSED
-- 
-- Gaps corrigidos:
--   1. empresa NULL + não-master → RAISE EXCEPTION (nunca devolve tudo)
--   2. escopo cross-empresa → RAISE EXCEPTION (não confiar no param do cliente)
--   3. gestor_departamento → amarra ao próprio colaborador_id (via get_my_colaborador_id)
--      se não achar vínculo → RETURN (lista vazia), nunca a empresa toda
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_colaboradores_seguro(
  p_company_id uuid DEFAULT NULL,
  p_gestor_id  uuid DEFAULT NULL
)
RETURNS SETOF public.colaboradores
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_is_master   boolean;
  v_my_company  uuid;
  v_role        public.app_role;
BEGIN
  -- Bloco 0: usuário não autenticado
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Rate limit (função já existe no banco desde 20260625...)
  PERFORM public.check_rate_limit(v_uid, 'colaboradores_list', 30, 60);

  v_is_master  := public.is_admin_master(v_uid);
  v_my_company := public.get_my_company_id();

  -- Fail-closed 1: usuário sem profile (company NULL) e não é admin_master → bloqueia
  IF NOT v_is_master AND v_my_company IS NULL THEN
    RAISE EXCEPTION 'company_id_required: usuário sem empresa vinculada' USING ERRCODE = '42501';
  END IF;

  v_role := public.get_my_role();

  -- Fail-closed 2: não-master não pode pedir dados de outra empresa
  IF NOT v_is_master THEN
    IF p_company_id IS NOT NULL AND p_company_id <> v_my_company THEN
      RAISE EXCEPTION 'forbidden_company_scope: acesso negado a outra empresa' USING ERRCODE = '42501';
    END IF;
    -- Força p_company_id para a empresa do chamador (ignora parâmetro do client)
    p_company_id := v_my_company;
  END IF;

  -- Fail-closed 3: gestor_departamento → amarra p_gestor_id ao próprio id de colaborador
  IF v_role = 'gestor_departamento' THEN
    p_gestor_id := public.get_my_colaborador_id();

    -- Se não tem vínculo como colaborador → retorna vazio (nunca a empresa toda)
    IF p_gestor_id IS NULL THEN
      RETURN; -- SETOF vazio
    END IF;
  END IF;

  RETURN QUERY
  SELECT c.*
  FROM public.colaboradores c
  WHERE (p_company_id IS NULL OR c.company_id = p_company_id)
    AND (p_gestor_id IS NULL OR c.gestor_id = p_gestor_id)
  ORDER BY c.full_name;
END;
$$;
