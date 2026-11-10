-- Migration: cliente_habilita_catalogo_global
-- Etapa 8.6 — Policy de SELECT para treinamentos globais e categorias da plataforma

BEGIN;

-- 1. Grants essenciais na tabela empresa_treinamentos_habilitados para authenticated
GRANT ALL ON public.empresa_treinamentos_habilitados TO authenticated;
GRANT ALL ON public.empresa_treinamentos_habilitados TO service_role;

-- 2. Policy aditiva para treinamentos globais na public.treinamentos
DROP POLICY IF EXISTS "treinamentos_global_habilitado_select" ON public.treinamentos;

CREATE POLICY "treinamentos_global_habilitado_select"
ON public.treinamentos FOR SELECT TO authenticated
USING (
  origem = 'plataforma'
  AND company_id IS NULL
  AND status = 'publicado'
  AND (
    (
      public.has_role(auth.uid(), 'admin_empresa'::public.app_role)
      OR public.has_role(auth.uid(), 'analista_rh'::public.app_role)
    )
    OR EXISTS (
      SELECT 1
      FROM public.empresa_treinamentos_habilitados eth
      WHERE eth.treinamento_id = treinamentos.id
        AND eth.habilitado = true
        AND eth.company_id = public.get_user_company_id(auth.uid())
    )
  )
);

-- 3. Policy aditiva para leitura de categorias da plataforma (company_id IS NULL)
DROP POLICY IF EXISTS "categorias_plataforma_select_policy" ON public.categorias_treinamento;

CREATE POLICY "categorias_plataforma_select_policy"
ON public.categorias_treinamento FOR SELECT TO authenticated
USING (
  company_id IS NULL
);

COMMIT;
