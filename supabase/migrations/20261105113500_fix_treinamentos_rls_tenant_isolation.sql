-- Migration: fix_treinamentos_rls_tenant_isolation
-- Descrição: Fecha vazamento entre tenants na policy de treinamentos garantindo isolamento estrito fail-closed

BEGIN;

DROP POLICY IF EXISTS "Colaboradores podem ver treinamentos publicados"
  ON public.treinamentos;
DROP POLICY IF EXISTS "treinamentos_select_policy"
  ON public.treinamentos;

CREATE POLICY "treinamentos_select_policy"
  ON public.treinamentos
  FOR SELECT
  TO authenticated
  USING (
    -- 1) Admin Master: tudo
    public.admin_master_scope(company_id)

    -- 2) Admin Empresa / Analista RH: SOMENTE própria empresa
    OR (
      (
        public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
        OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
      )
      AND company_id = public.get_my_company_id()
    )

    -- 3) Colaborador: publicados da própria empresa
    OR (
      status = 'publicado'::public.treinamento_status
      AND company_id = public.get_user_company_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin pode gerenciar treinamentos"
  ON public.treinamentos;
DROP POLICY IF EXISTS "treinamentos_manage_policy"
  ON public.treinamentos;

CREATE POLICY "treinamentos_manage_policy"
  ON public.treinamentos
  FOR ALL
  TO authenticated
  USING (
    public.admin_master_scope(company_id)
    OR (
      (
        public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
        OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
      )
      AND company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    public.admin_master_scope(company_id)
    OR (
      (
        public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
        OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
      )
      AND company_id = public.get_my_company_id()
    )
  );

COMMIT;
