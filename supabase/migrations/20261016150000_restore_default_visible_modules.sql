-- ============================================================================
-- Restaura o padrão "visível por padrão" em get_visible_modules(p_company_id)
--
-- DECISÃO: a migration 20261014120000_multiempresa_user_companies.sql trocou
--   ELSE COALESCE(cp.papel_visivel, true)   (comportamento de 13/10, company_modules)
-- por
--   ELSE false
-- Como module_visibility NÃO possui linhas para o papel 'colaborador' (e só
-- possui linhas false explícitas para gestor_departamento/analista_rh), o
-- fail-closed ocultou TODOS os módulos de TODOS os colaboradores de todas as
-- empresas (0 de 29 visíveis; menu exibindo apenas o Dashboard).
--
-- O padrão intencional é o de 13/10: papel SEM linha em module_visibility vê o
-- módulo; linhas com visible=false EXPLÍCITO (ex.: seed 20261008100000, que
-- oculta /estrutura-organizacional e /mapa-riscos-nr1 para gestor_departamento)
-- continuam sendo a exceção e CONTINUAM VALENDO.
--
-- Mantidos sem alteração: validação de fronteira multi-tenant via
-- user_companies (com fallback temporário em profiles), bypass de super_admin,
-- company_modules.enabled=false desligando o módulo para todos os papéis, e
-- admin_empresa/admin_master vendo tudo o que está habilitado.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_visible_modules(p_company_id uuid)
RETURNS TABLE (module_key text, visible boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_role app_role;
    v_is_super boolean;
BEGIN
    SELECT has_role(auth.uid(), 'super_admin') INTO v_is_super;

    -- 1. Super Admin vê tudo, sempre
    IF v_is_super THEN
        RETURN QUERY
        SELECT c.module_key, true FROM public.catalogo_modulos c WHERE c.ativo = true
        UNION
        SELECT unnest(c.sub_rotas), true FROM public.catalogo_modulos c
        WHERE c.ativo = true AND array_length(c.sub_rotas, 1) > 0;
        RETURN;
    END IF;

    -- 2. Multi-tenant boundary com user_companies
    SELECT role INTO v_user_role
    FROM public.user_companies
    WHERE user_id = auth.uid() AND company_id = p_company_id;

    -- TEMPORÁRIO (Ciclo A): fallback de compatibilidade com profiles.company_id
    -- Será removido no Ciclo B
    IF v_user_role IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND company_id = p_company_id) THEN
            SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
        ELSE
            -- Sem vínculo com a empresa solicitada: fail-closed imediato
            RETURN;
        END IF;
    END IF;

    -- Avaliação em cascata:
    -- Camada 1: company_modules.enabled
    -- Camada 2: module_visibility.visible (padrão true quando não há linha)
    RETURN QUERY
    WITH cascata_principal AS (
      SELECT 
        c.module_key,
        c.sub_rotas,
        COALESCE(cm.enabled, true) AS empresa_habilitou,
        mv.visible AS papel_visivel
      FROM public.catalogo_modulos c
      LEFT JOIN public.company_modules cm 
        ON cm.company_id = p_company_id AND cm.module_key = c.module_key
      LEFT JOIN public.module_visibility mv
        ON mv.company_id = p_company_id AND mv.module_key = c.module_key AND mv.role = v_user_role
      WHERE c.ativo = true
    ),
    resultado_calculado AS (
      SELECT 
        cp.module_key,
        CASE
          WHEN cp.empresa_habilitou = false THEN false
          WHEN v_user_role IN ('admin_empresa', 'admin_master') THEN true
          WHEN cp.papel_visivel IS NOT NULL THEN cp.papel_visivel
          ELSE true
        END AS visible
      FROM cascata_principal cp
    ),
    resultado_subrotas AS (
      SELECT 
        unnest(cp.sub_rotas) AS module_key,
        CASE
          WHEN cp.empresa_habilitou = false THEN false
          WHEN v_user_role IN ('admin_empresa', 'admin_master') THEN true
          WHEN cp.papel_visivel IS NOT NULL THEN cp.papel_visivel
          ELSE true
        END AS visible
      FROM cascata_principal cp
      WHERE array_length(cp.sub_rotas, 1) > 0
    )
    SELECT rc.module_key, rc.visible FROM resultado_calculado rc
    UNION ALL
    SELECT rs.module_key, rs.visible FROM resultado_subrotas rs;
END;
$$;
