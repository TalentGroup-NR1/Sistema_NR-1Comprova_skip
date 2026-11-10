-- ============================================================================
-- MIGRATION: 20261014150000_direct_company_branding.sql
-- OBJETIVO: Resolução direta e resiliente de branding no ambiente logado
--           sem acoplamento à lista geral de empresas (independente de RLS/cache).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_company_branding(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row record;
  v_has_access boolean := false;
BEGIN
  IF v_uid IS NULL OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- 1. Verifica se é Super Admin da plataforma
  IF public.is_super_admin(v_uid) THEN
    v_has_access := true;
  END IF;

  -- 2. Se a tabela user_companies existir, verifica vínculo
  IF NOT v_has_access AND to_regclass('public.user_companies') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.user_companies WHERE user_id = $1 AND company_id = $2)'
      INTO v_has_access
      USING v_uid, p_company_id;
  END IF;

  -- 3. Verifica profile do usuário
  IF NOT v_has_access THEN
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid AND company_id = p_company_id)
      INTO v_has_access;
  END IF;

  -- 4. Verifica vínculo na tabela colaboradores
  IF NOT v_has_access THEN
    SELECT EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = v_uid AND company_id = p_company_id)
      INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('found', false, 'forbidden', true);
  END IF;

  -- 5. Busca dados visuais de branding da empresa
  SELECT 
    c.name,
    c.brand_name,
    coalesce(c.brand_logo_url, c.logo_url)           AS logo_url,
    coalesce(c.brand_primary_color, c.primary_color) AS primary_color,
    c.brand_favicon_url,
    coalesce(c.is_internal, false)                   AS is_internal
  INTO v_row
  FROM public.companies c
  WHERE c.id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'brand_name', coalesce(v_row.brand_name, v_row.name, 'NR-1Comprova'),
    'logo_url', v_row.logo_url,
    'primary_color', v_row.primary_color,
    'favicon_url', v_row.brand_favicon_url,
    'is_internal', v_row.is_internal
  );
END;
$$;

-- Permissões de execução: apenas usuários autenticados (e service_role)
REVOKE EXECUTE ON FUNCTION public.get_my_company_branding(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_company_branding(uuid) TO authenticated, service_role;
