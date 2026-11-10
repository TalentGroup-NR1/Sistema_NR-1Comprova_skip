-- ============================================================================
-- MIGRATION: 20261014160000_fix_security_grants_and_super_admin_policies.sql
-- OBJETIVO:
--   1. Conceder GRANT EXECUTE nas 9+ funções centrais de segurança para 'authenticated'
--      e 'service_role' (resolvendo a onda de erros 42501 / HTTP 403 nas leituras).
--   2. Atualizar public.is_admin_master(_user_id uuid) para incluir o papel 'super_admin'
--      (garantindo que todas as policies históricas de admin_master contemplem super_admin).
--   3. Criar policies explícitas de Super Admin para as tabelas de dados centrais:
--      colaboradores, feedback_cycles (milestones/roadmap), feedback_responses e profiles.
--   4. Blindar get_company_branding_by_email com p_email DEFAULT NULL e extração de IP segura,
--      executando NOTIFY pgrst, 'reload schema' para eliminar o erro 400 no login.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ATUALIZAÇÃO DA FUNÇÃO is_admin_master PARA CONTEMPLAR super_admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master', 'super_admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. BLINDAGEM DA RPC get_company_branding_by_email CONTRA ERRO 400
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_company_branding_by_email(p_email text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_ip text;
  v_ip_uuid uuid;
  v_clean_email text;
  v_user_id uuid;
  v_company_id uuid;
  v_multi_company_id uuid;
  v_brand_name text;
  v_logo_url text;
  v_primary_color text;
  v_favicon_url text;
  v_headers_raw text;
BEGIN
  -- 1. Sanitização e validação de formato mínimo
  IF p_email IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_clean_email := lower(btrim(p_email));
  IF v_clean_email = '' OR v_clean_email NOT LIKE '%_@__%.__%' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- 2. Rate-limiting por IP com leitura de headers blindada
  BEGIN
    v_headers_raw := current_setting('request.headers', true);
    IF v_headers_raw IS NOT NULL AND v_headers_raw <> '' THEN
      BEGIN
        v_client_ip := coalesce(
          nullif(split_part((v_headers_raw::json)->>'x-forwarded-for', ',', 1), ''),
          nullif((v_headers_raw::json)->>'cf-connecting-ip', ''),
          '127.0.0.1'
        );
      EXCEPTION WHEN OTHERS THEN
        v_client_ip := '127.0.0.1';
      END;
    ELSE
      v_client_ip := '127.0.0.1';
    END IF;

    v_ip_uuid := md5(v_client_ip)::uuid;
    PERFORM public.check_rate_limit(v_ip_uuid, 'branding_login_email', 15, 60);
  EXCEPTION WHEN OTHERS THEN
    -- Fail-safe silencioso: não bloqueia a resolução visual por erro de rate limit interno
    NULL;
  END;

  -- 3. Match estrito por e-mail exato em profiles (usando coluna email do profile)
  SELECT p.user_id, p.company_id INTO v_user_id, v_company_id
  FROM public.profiles p
  WHERE lower(btrim(p.email)) = v_clean_email
  LIMIT 1;

  -- 4. Cenário Multiempresa: prioriza vínculo com is_default = true
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_companies'
    ) THEN
      SELECT uc.company_id INTO v_multi_company_id
      FROM public.user_companies uc
      WHERE uc.user_id = v_user_id
      ORDER BY uc.is_default DESC, uc.created_at ASC
      LIMIT 1;

      IF v_multi_company_id IS NOT NULL THEN
        v_company_id := v_multi_company_id;
      END IF;
    END IF;
  END IF;

  -- 5. Fallback por e-mail exato em colaboradores (caso profile ainda não exista)
  IF v_company_id IS NULL THEN
    SELECT col.company_id INTO v_company_id
    FROM public.colaboradores col
    WHERE lower(btrim(col.email)) = v_clean_email
      AND col.status = 'ativo'
    LIMIT 1;
  END IF;

  -- 6. Fallback por e-mail exato cadastral da empresa (companies.email)
  IF v_company_id IS NULL THEN
    SELECT c.id INTO v_company_id
    FROM public.companies c
    WHERE lower(btrim(c.email)) = v_clean_email
      AND c.status = 'active'
    LIMIT 1;
  END IF;

  -- Se não localizou nenhuma empresa para este e-mail
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- 7. Busca EXCLUSIVAMENTE dados visuais públicos da empresa
  SELECT 
    coalesce(c.brand_name, c.name, 'NR-1Comprova') AS brand_name,
    coalesce(c.brand_logo_url, c.logo_url, '/images/nr-1comprova-logo.png?v=2') AS logo_url,
    coalesce(c.brand_primary_color, c.primary_color, '#C8102E') AS primary_color,
    coalesce(c.brand_favicon_url, '/favicon.png') AS favicon_url
  INTO v_brand_name, v_logo_url, v_primary_color, v_favicon_url
  FROM public.companies c
  WHERE c.id = v_company_id AND c.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'brand_name', v_brand_name,
    'logo_url', v_logo_url,
    'primary_color', v_primary_color,
    'favicon_url', v_favicon_url
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. CONCESSÃO DE PRIVILÉGIOS (GRANT EXECUTE) NAS FUNÇÕES DE SEGURANÇA
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_master(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_colaborador_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'estrut_can_read' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.estrut_can_read(uuid) TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'colaborador_has_avaliacao_in_ciclo' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.colaborador_has_avaliacao_in_ciclo(uuid) TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_master_scope' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.admin_master_scope(uuid) TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_pulse_campaign_alvos' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.can_access_pulse_campaign_alvos(uuid) TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'psico_is_rh' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.psico_is_rh() TO authenticated, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'psico_instrumento_em_uso' AND pronamespace = 'public'::regnamespace) THEN
    GRANT EXECUTE ON FUNCTION public.psico_instrumento_em_uso(uuid) TO authenticated, service_role;
  END IF;
END $$;

-- Permissões na RPC pública de login
REVOKE EXECUTE ON FUNCTION public.get_company_branding_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_branding_by_email(text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. POLICIES EXPLÍCITAS PARA SUPER ADMIN NAS TABELAS DE DADOS
-- ----------------------------------------------------------------------------

-- public.colaboradores
DROP POLICY IF EXISTS "Super admin pode gerenciar colaboradores" ON public.colaboradores;
CREATE POLICY "Super admin pode gerenciar colaboradores"
  ON public.colaboradores
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- public.feedback_cycles (milestones / roadmap)
DROP POLICY IF EXISTS "Super admin pode gerenciar feedback_cycles" ON public.feedback_cycles;
CREATE POLICY "Super admin pode gerenciar feedback_cycles"
  ON public.feedback_cycles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- public.feedback_responses
DROP POLICY IF EXISTS "Super admin pode gerenciar feedback_responses" ON public.feedback_responses;
CREATE POLICY "Super admin pode gerenciar feedback_responses"
  ON public.feedback_responses
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- public.profiles
DROP POLICY IF EXISTS "Super admin pode gerenciar profiles" ON public.profiles;
CREATE POLICY "Super admin pode gerenciar profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. RELOAD DE SCHEMA DO POSTGREST
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
