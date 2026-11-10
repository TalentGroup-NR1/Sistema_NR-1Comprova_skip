-- ============================================================================
-- MIGRATION: 20261014120000_multiempresa_user_companies.sql
-- OBJETIVO: Fundação Multiempresa - Vínculos N:N, papel por empresa, isolamento
--           estrito no banco (fail-closed) e alternância de tenant sem relogin.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA USER_COMPANIES (VÍNCULO N:N COM PAPEL POR EMPRESA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'colaborador',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_companies_unique UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user ON public.user_companies (user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON public.user_companies (company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_comp ON public.user_companies (user_id, company_id);

-- Trigger para atualização automática da coluna updated_at
DROP TRIGGER IF EXISTS trg_user_companies_updated_at ON public.user_companies;
CREATE TRIGGER trg_user_companies_updated_at
  BEFORE UPDATE ON public.user_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitação de RLS
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- Policy de Leitura: O usuário pode ler seus próprios vínculos OU Super Admin lê tudo
DROP POLICY IF EXISTS "user_companies_select" ON public.user_companies;
CREATE POLICY "user_companies_select"
  ON public.user_companies
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_super_admin(auth.uid())
  );

-- CORREÇÃO OBRIGATÓRIA 1: No Ciclo A, a escrita em user_companies é restrita
-- EXCLUSIVAMENTE ao Super Admin da plataforma. admin_empresa NÃO pode conceder
-- papéis nem criar vínculos (evita escalada de privilégios para admin_master).
DROP POLICY IF EXISTS "user_companies_write" ON public.user_companies;
CREATE POLICY "user_companies_write"
  ON public.user_companies
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTION: has_company_access(company_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = _company_id
    )
    -- TEMPORÁRIO (Ciclo A): fallback de compatibilidade com profiles.company_id
    OR (_company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_company_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. CORREÇÃO OBRIGATÓRIA 2: TRIGGER DE SINCRONIZAÇÃO EM PROFILES
-- Garante que todo novo usuário criado via register-company, create-user,
-- finalize-colaborador-user ou update-user nasça imediatamente com seu vínculo
-- em user_companies com o papel derivado da precedência existente.
-- É estritamente IDEMPOTENTE: não duplica vínculos existentes (ex.: set_active_company).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_sync_profile_user_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_derived_role app_role;
  v_is_first boolean;
BEGIN
  -- Só processa se houver company_id preenchido
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se o vínculo (user_id, company_id) já existir, não faz nada (idempotente)
  IF EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = NEW.user_id AND company_id = NEW.company_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Determina se este é o primeiro vínculo do usuário
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_companies WHERE user_id = NEW.user_id
  ) INTO v_is_first;

  -- Deriva o papel da tabela user_roles existente (ou fallback para colaborador)
  SELECT ur.role INTO v_derived_role
  FROM public.user_roles ur
  WHERE ur.user_id = NEW.user_id
    AND ur.role <> 'super_admin'
  ORDER BY CASE ur.role
    WHEN 'admin_master' THEN 1
    WHEN 'admin_empresa' THEN 2
    WHEN 'analista_rh' THEN 3
    WHEN 'gestor_departamento' THEN 4
    WHEN 'colaborador' THEN 5
    ELSE 6
  END
  LIMIT 1;

  v_derived_role := COALESCE(v_derived_role, 'colaborador'::app_role);

  -- Cria o vínculo na user_companies
  INSERT INTO public.user_companies (user_id, company_id, role, is_default)
  VALUES (NEW.user_id, NEW.company_id, v_derived_role, v_is_first)
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_user_company ON public.profiles;
CREATE TRIGGER trg_sync_profile_user_company
  AFTER INSERT OR UPDATE OF company_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_profile_user_company();

-- ----------------------------------------------------------------------------
-- 4. RPC ATÔMICA set_active_company(p_company_id) (FAIL-CLOSED)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_active_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_link boolean;
  v_is_super boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT public.is_super_admin(auth.uid()) INTO v_is_super;

  -- Se não for super_admin da plataforma, exige vínculo explícito em user_companies
  IF NOT v_is_super THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_companies
      WHERE user_id = auth.uid() AND company_id = p_company_id
    ) INTO v_has_link;

    IF NOT v_has_link THEN
      RAISE EXCEPTION 'Acesso negado: usuário não possui vínculo ativo com esta empresa.';
    END IF;
  END IF;

  -- Sincroniza profiles.company_id para compatibilidade imediata com todas as policies
  UPDATE public.profiles
  SET company_id = p_company_id,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_active_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_company(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. ATUALIZAÇÃO DA RPC get_my_role()
-- Resolve o papel PELA EMPRESA EFETIVA associada ao vínculo do usuário.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cid uuid;
  v_role app_role;
BEGIN
  -- Super admin da plataforma
  IF public.is_super_admin(auth.uid()) THEN
    RETURN 'admin_master'::app_role;
  END IF;

  -- 1. Obtém a empresa ativa registrada no profile
  SELECT company_id INTO v_cid FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  -- 2. Busca o papel associado ao vínculo em user_companies
  IF v_cid IS NOT NULL THEN
    SELECT role INTO v_role
    FROM public.user_companies
    WHERE user_id = auth.uid() AND company_id = v_cid
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- TEMPORÁRIO (Ciclo A): fallback para user_roles legado.
  -- Será removido no Ciclo B após migração completa de dados.
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role <> 'super_admin'
  ORDER BY CASE role
    WHEN 'admin_master' THEN 1
    WHEN 'admin_empresa' THEN 2
    WHEN 'analista_rh' THEN 3
    WHEN 'gestor_departamento' THEN 4
    WHEN 'colaborador' THEN 5
    ELSE 6
  END
  LIMIT 1;

  RETURN COALESCE(v_role, 'colaborador'::app_role);
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. ATUALIZAÇÃO DA RPC get_visible_modules(p_company_id)
-- Validação de multi-tenant boundary baseada em user_companies e papel por empresa.
-- ----------------------------------------------------------------------------
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
    -- Camada 2: module_visibility.visible
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
          ELSE false
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
          ELSE false
        END AS visible
      FROM cascata_principal cp
      WHERE array_length(cp.sub_rotas, 1) > 0
    )
    SELECT rc.module_key, rc.visible FROM resultado_calculado rc
    UNION ALL
    SELECT rs.module_key, rs.visible FROM resultado_subrotas rs;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ATUALIZAÇÃO DE RLS NAS TABELAS COMPANIES E COMPANY_MODULES
-- Permite leitura de empresas e pacotes onde o usuário possui vínculo ativo.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read linked companies" ON public.companies;
CREATE POLICY "Users can read linked companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = public.companies.id
    ) OR
    -- TEMPORÁRIO (Ciclo A): fallback legado
    id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "Users can read company_modules for their company" ON public.company_modules;
CREATE POLICY "Users can read company_modules for their company"
  ON public.company_modules
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin') OR
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = public.company_modules.company_id
    ) OR
    -- TEMPORÁRIO (Ciclo A): fallback legado
    company_id = (SELECT c.company_id FROM public.profiles c WHERE c.user_id = auth.uid() LIMIT 1)
  );

-- ----------------------------------------------------------------------------
-- 8. BACKFILL IDEMPOTENTE A PARTIR DE PROFILES
-- Transforma cada perfil existente em um vínculo na nova tabela user_companies
-- ----------------------------------------------------------------------------
INSERT INTO public.user_companies (user_id, company_id, role, is_default)
SELECT 
  p.user_id,
  p.company_id,
  COALESCE(
    (SELECT ur.role 
     FROM public.user_roles ur 
     WHERE ur.user_id = p.user_id 
       AND ur.role <> 'super_admin'
     ORDER BY CASE ur.role
       WHEN 'admin_master' THEN 1
       WHEN 'admin_empresa' THEN 2
       WHEN 'analista_rh' THEN 3
       WHEN 'gestor_departamento' THEN 4
       WHEN 'colaborador' THEN 5
       ELSE 6
     END
     LIMIT 1),
    'colaborador'::app_role
  ) AS role,
  true AS is_default
FROM public.profiles p
JOIN public.companies c ON c.id = p.company_id
WHERE p.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;
