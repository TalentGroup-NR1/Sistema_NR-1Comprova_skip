-- Migration: 20261027161000_gestor_colaboradores_department_view.sql
-- Etapa 2: Escopo de visualização de colaboradores para gestor_departamento (department e subordinados diretos)

-- 1. Atualizar policy de SELECT em public.colaboradores
DROP POLICY IF EXISTS "Colaboradores can view their own record" ON public.colaboradores;
CREATE POLICY "Colaboradores can view their own record"
ON public.colaboradores FOR SELECT
USING (
  ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
     FROM profiles p
    WHERE ((p.user_id = auth.uid()) AND (p.is_active = true)))))
  OR admin_master_scope(company_id)
  OR (
    (get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role]))
    AND (company_id = get_user_company_id(auth.uid()))
  )
  OR (
    (get_user_role(auth.uid()) = 'gestor_departamento'::app_role OR get_my_role() = 'gestor_departamento'::app_role)
    AND (company_id = get_user_company_id(auth.uid()))
    AND (
      gestor_id = get_my_colaborador_id()
      OR (
        department IS NOT NULL
        AND department = (SELECT c2.department FROM public.colaboradores c2 WHERE c2.user_id = auth.uid() LIMIT 1)
      )
    )
  )
);

-- 2. Atualizar RPC get_colaboradores_seguro para incluir escopo de departamento para gestor_departamento
CREATE OR REPLACE FUNCTION public.get_colaboradores_seguro(
  p_company_id uuid DEFAULT NULL,
  p_gestor_id uuid DEFAULT NULL
)
RETURNS SETOF public.colaboradores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_is_master   boolean;
  v_my_company  uuid;
  v_role        public.app_role;
  v_my_dept     text;
  v_my_colab_id uuid;
BEGIN
  -- Bloco 0: usuário não autenticado
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Rate limit
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
    -- Força p_company_id para a empresa do chamador
    p_company_id := v_my_company;
  END IF;

  -- Fail-closed 3: gestor_departamento → visualização do próprio departamento ou subordinados diretos
  IF v_role = 'gestor_departamento' THEN
    SELECT c.id, c.department INTO v_my_colab_id, v_my_dept
    FROM public.colaboradores c
    WHERE c.user_id = v_uid
    LIMIT 1;

    -- Se não tem vínculo como colaborador → retorna vazio (nunca a empresa toda)
    IF v_my_colab_id IS NULL AND v_my_dept IS NULL THEN
      RETURN; -- SETOF vazio
    END IF;

    RETURN QUERY
    SELECT c.*
    FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND (
        (v_my_dept IS NOT NULL AND c.department = v_my_dept)
        OR (v_my_colab_id IS NOT NULL AND c.gestor_id = v_my_colab_id)
      )
    ORDER BY c.full_name;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.*
  FROM public.colaboradores c
  WHERE (p_company_id IS NULL OR c.company_id = p_company_id)
    AND (p_gestor_id IS NULL OR c.gestor_id = p_gestor_id)
  ORDER BY c.full_name;
END;
$$;
