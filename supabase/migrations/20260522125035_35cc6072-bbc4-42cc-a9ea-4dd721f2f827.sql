
ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS target_company_ids uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS obrigatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_contract_types text[] DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_treinamentos_target_companies
  ON public.treinamentos USING GIN (target_company_ids);

DROP POLICY IF EXISTS "Colaboradores podem ver treinamentos publicados" ON public.treinamentos;

CREATE POLICY "Colaboradores podem ver treinamentos publicados"
ON public.treinamentos
FOR SELECT
USING (
  is_admin_master(auth.uid())
  OR has_role(auth.uid(), 'admin_empresa'::app_role)
  OR has_role(auth.uid(), 'analista_rh'::app_role)
  OR (
    status = 'publicado'::treinamento_status
    AND (
      company_id = get_user_company_id(auth.uid())
      OR get_user_company_id(auth.uid()) = ANY(COALESCE(target_company_ids, ARRAY[]::uuid[]))
    )
  )
);
