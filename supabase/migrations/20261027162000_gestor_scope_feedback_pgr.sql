-- Migration: 20261027162000_gestor_scope_feedback_pgr.sql
-- Etapa 3: Fechar vazamentos em feedback_cycles, feedback_responses e pgr_plano_acao

-- 1. pgr_plano_acao: remover ALL para gestor_departamento e conceder apenas SELECT restrito ao departamento
DROP POLICY IF EXISTS "Acesso as acoes da propria empresa" ON public.pgr_plano_acao;
CREATE POLICY "Acesso as acoes da propria empresa"
ON public.pgr_plano_acao FOR ALL
USING (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND (company_id = get_my_company_id())
)
WITH CHECK (
  (has_role(auth.uid(), 'admin_empresa'::app_role) OR has_role(auth.uid(), 'analista_rh'::app_role))
  AND (company_id = get_my_company_id())
);

DROP POLICY IF EXISTS "Gestor departamento can view department pgr_plano_acao" ON public.pgr_plano_acao;
CREATE POLICY "Gestor departamento can view department pgr_plano_acao"
ON public.pgr_plano_acao FOR SELECT
USING (
  (public.get_my_role() = 'gestor_departamento'::public.app_role OR public.has_role(auth.uid(), 'gestor_departamento'::public.app_role))
  AND company_id = public.get_my_company_id()
  AND (
    onde = (SELECT c.department FROM public.colaboradores c WHERE c.user_id = auth.uid() LIMIT 1)
    OR responsavel_id IN (
      SELECT c.id FROM public.colaboradores c
      WHERE c.company_id = public.get_my_company_id()
        AND (
          c.department = (SELECT c2.department FROM public.colaboradores c2 WHERE c2.user_id = auth.uid() LIMIT 1)
          OR c.gestor_id = public.get_my_colaborador_id()
        )
    )
  )
);

-- 2. feedback_cycles: remover company_id aberto e restringir gestor_departamento a departamento / subordinados
DROP POLICY IF EXISTS "Users can view own feedback cycles via colaborador link" ON public.feedback_cycles;
CREATE POLICY "Users can view own feedback cycles via colaborador link"
ON public.feedback_cycles FOR SELECT
USING (
  colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
  OR admin_master_scope(company_id)
  OR (
    get_user_role(auth.uid()) = ANY (ARRAY['admin_empresa'::app_role, 'analista_rh'::app_role])
    AND company_id = get_user_company_id(auth.uid())
  )
  OR (
    (get_user_role(auth.uid()) = 'gestor_departamento'::app_role OR get_my_role() = 'gestor_departamento'::app_role)
    AND company_id = get_user_company_id(auth.uid())
    AND colaborador_id IN (
      SELECT c.id FROM public.colaboradores c
      WHERE c.company_id = get_user_company_id(auth.uid())
        AND (
          c.gestor_id = public.get_my_colaborador_id()
          OR (
            c.department IS NOT NULL
            AND c.department = (SELECT c2.department FROM public.colaboradores c2 WHERE c2.user_id = auth.uid() LIMIT 1)
          )
        )
    )
  )
);

-- 3. feedback_responses: restringir visualização de respostas a ciclos do departamento / subordinados
DROP POLICY IF EXISTS "Gestor departamento can view feedback_responses" ON public.feedback_responses;
CREATE POLICY "Gestor departamento can view feedback_responses"
ON public.feedback_responses FOR SELECT
USING (
  (has_role(auth.uid(), 'gestor_departamento'::app_role) OR get_my_role() = 'gestor_departamento'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.feedback_cycles fc
    JOIN public.colaboradores c ON c.id = fc.colaborador_id
    WHERE fc.id = feedback_responses.feedback_cycle_id
      AND fc.company_id = get_user_company_id(auth.uid())
      AND (
        c.gestor_id = public.get_my_colaborador_id()
        OR (
          c.department IS NOT NULL
          AND c.department = (SELECT c2.department FROM public.colaboradores c2 WHERE c2.user_id = auth.uid() LIMIT 1)
        )
      )
  )
);
