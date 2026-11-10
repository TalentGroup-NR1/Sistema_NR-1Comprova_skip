
DROP POLICY IF EXISTS "Anyone authenticated can insert audit logs" ON public.certificates_audit_logs;
CREATE POLICY "Scoped insert audit logs" ON public.certificates_audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = certificates_audit_logs.certificate_id
      AND (
        public.is_admin_master(auth.uid())
        OR c.company_id = public.get_user_company_id(auth.uid())
      )
  )
);

DROP POLICY IF EXISTS catalogo_select_auth ON public.nr1_riscos_catalogo;
CREATE POLICY catalogo_select_auth ON public.nr1_riscos_catalogo
FOR SELECT TO authenticated
USING (
  (company_id IS NULL AND editavel = false)
  OR company_id = public.get_my_company_id()
  OR public.is_admin_master(auth.uid())
);

DROP POLICY IF EXISTS psico_avaliacao_ghes_colab_select ON public.psico_avaliacao_ghes;
CREATE POLICY psico_avaliacao_ghes_colab_select ON public.psico_avaliacao_ghes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.psico_atribuicoes t
    WHERE t.avaliacao_id = psico_avaliacao_ghes.avaliacao_id
      AND t.colaborador_id = public.get_my_colaborador_id()
  )
);
