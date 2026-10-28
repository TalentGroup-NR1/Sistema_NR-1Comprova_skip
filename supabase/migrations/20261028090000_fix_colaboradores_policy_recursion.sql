-- Migration: 20261028090000_fix_colaboradores_policy_recursion.sql
-- HOTFIX: a policy "Colaboradores can view their own record" (20261027161000) fazia
-- subquery direta em public.colaboradores dentro de uma policy da própria tabela,
-- causando 42P17 (infinite recursion detected in policy for relation "colaboradores")
-- e derrubando em cascata ferias_gozo, pgr_plano_acao, feedback_cycles,
-- transferencias_colaborador e collaborator_consents.
-- Correção: helper SECURITY DEFINER (bypassa RLS). Lógica de escopo do gestor
-- (department + gestor_id) mantida inalterada.

-- 1. Helper sem recursão
CREATE OR REPLACE FUNCTION public.get_my_colaborador_department()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.colaboradores WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_colaborador_department() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_colaborador_department() TO authenticated;

-- 2. Recriar a policy substituindo a subquery recursiva pelo helper
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
        AND department = public.get_my_colaborador_department()
      )
    )
  )
);
