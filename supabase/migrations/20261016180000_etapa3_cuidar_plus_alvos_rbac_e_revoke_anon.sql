-- ============================================================================
-- ETAPA 3: RBAC em questionarios_cuidar_plus_alvos + Revoke DML anon
-- Data: 2026-10-16
-- 
-- 1. RBAC em public.questionarios_cuidar_plus_alvos:
--    - Helper functions SECURITY DEFINER para checagem de tenant sem recursão RLS:
--      * can_access_cuidar_plus_alvos (SELECT: membros da empresa)
--      * can_manage_cuidar_plus_alvos (INSERT/UPDATE/DELETE: admin_empresa, analista_rh, admin_master)
--    - Remove a política ALL permissiva ("Users can access their company cuidamais alvos")
--    - Adiciona política de SELECT restrita a membros
--    - Adiciona políticas de INSERT/UPDATE/DELETE restritas a admins/analistas
--
-- 2. Revoke DML de anon:
--    - Remove privilégios desnecessários de INSERT, UPDATE, DELETE e TRUNCATE
--      nas tabelas module_visibility, pulse_campaigns_alvos e questionarios_cuidar_plus_alvos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1: Funções Helper de Acesso Seguro (Security Definer com search_path fixo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_cuidar_plus_alvos(p_questionario_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = p_questionario_id
      AND (
        is_admin_master(auth.uid())
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.user_companies uc
          WHERE uc.user_id = auth.uid()
            AND uc.company_id = q.company_id
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
            AND p.company_id = q.company_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_cuidar_plus_alvos(p_questionario_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.questionarios_cuidar_plus q
    WHERE q.id = p_questionario_id
      AND (
        is_admin_master(auth.uid())
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.user_companies uc
          WHERE uc.user_id = auth.uid()
            AND uc.company_id = q.company_id
            AND uc.role IN ('admin_empresa', 'analista_rh', 'admin_master')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
            AND p.company_id = q.company_id
            AND (
              has_role(auth.uid(), 'admin_empresa'::app_role)
              OR has_role(auth.uid(), 'analista_rh'::app_role)
            )
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_cuidar_plus_alvos(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_cuidar_plus_alvos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_cuidar_plus_alvos(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_cuidar_plus_alvos(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- PARTE 2: Políticas RLS em public.questionarios_cuidar_plus_alvos
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can access their company cuidamais alvos" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_select_scoped" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_admin_insert_scoped" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_admin_update_scoped" ON public.questionarios_cuidar_plus_alvos;
DROP POLICY IF EXISTS "questionarios_cuidar_plus_alvos_admin_delete_scoped" ON public.questionarios_cuidar_plus_alvos;

-- 1. SELECT: Membros da empresa dona do questionário (colaboradores e admins)
CREATE POLICY "questionarios_cuidar_plus_alvos_select_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR SELECT
TO authenticated
USING (can_access_cuidar_plus_alvos(questionario_id));

-- 2. INSERT: Apenas admin_empresa, analista_rh ou admin_master da empresa do questionário
CREATE POLICY "questionarios_cuidar_plus_alvos_admin_insert_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR INSERT
TO authenticated
WITH CHECK (can_manage_cuidar_plus_alvos(questionario_id));

-- 3. UPDATE: Apenas admin_empresa, analista_rh ou admin_master da empresa do questionário
CREATE POLICY "questionarios_cuidar_plus_alvos_admin_update_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR UPDATE
TO authenticated
USING (can_manage_cuidar_plus_alvos(questionario_id))
WITH CHECK (can_manage_cuidar_plus_alvos(questionario_id));

-- 4. DELETE: Apenas admin_empresa, analista_rh ou admin_master da empresa do questionário
CREATE POLICY "questionarios_cuidar_plus_alvos_admin_delete_scoped"
ON public.questionarios_cuidar_plus_alvos
FOR DELETE
TO authenticated
USING (can_manage_cuidar_plus_alvos(questionario_id));

-- ----------------------------------------------------------------------------
-- PARTE 3: REVOKE DML de anon em tabelas protegidas
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.module_visibility FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pulse_campaigns_alvos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.questionarios_cuidar_plus_alvos FROM anon;
