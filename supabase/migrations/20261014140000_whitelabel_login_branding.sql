-- ============================================================================
-- MIGRATION: 20261014140000_whitelabel_login_branding.sql
-- OBJETIVO:
--   1. RPC public.get_company_branding_by_email(p_email text)
--      - Rate-limiting por IP anônimo/autenticado via check_rate_limit
--      - Match estrito por e-mail exato cadastrado (NUNCA por domínio)
--      - Resolução de multiempresa: prioriza vínculo com is_default = true
--      - Retorna EXCLUSIVAMENTE dados visuais públicos (sem IDs ou dados internos)
--   2. RPC public.get_company_branding_by_slug(p_slug text)
--      - Consulta por nome/slug de empresa com rate limiting
--   3. Concessão de permissões seguras para anon e authenticated
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_company_branding_by_email(p_email text)
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
BEGIN
  -- 1. Sanitização e validação de formato mínimo
  v_clean_email := lower(btrim(p_email));
  IF v_clean_email IS NULL OR v_clean_email = '' OR v_clean_email NOT LIKE '%_@__%.__%' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- 2. Rate-limiting por IP (15 requisições por minuto por IP)
  BEGIN
    v_client_ip := coalesce(
      nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
      nullif(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
      '127.0.0.1'
    );
    v_ip_uuid := md5(v_client_ip)::uuid;
    PERFORM public.check_rate_limit(v_ip_uuid, 'branding_login_email', 15, 60);
  EXCEPTION WHEN OTHERS THEN
    -- Bloqueio ou falha de rate limit: fail-safe silencioso retornando fallback padrão
    RETURN jsonb_build_object('found', false, 'rate_limited', true);
  END;

  -- 3. Match estrito por e-mail exato em profiles
  SELECT p.user_id, p.company_id INTO v_user_id, v_company_id
  FROM public.profiles p
  WHERE lower(btrim(p.email)) = v_clean_email
  LIMIT 1;

  -- 4. Cenário Multiempresa: se o usuário tem vínculos em user_companies,
  --    prioriza o vínculo com is_default = true (Condicional 2 de negócio)
  IF v_user_id IS NOT NULL THEN
    SELECT uc.company_id INTO v_multi_company_id
    FROM public.user_companies uc
    WHERE uc.user_id = v_user_id
    ORDER BY uc.is_default DESC, uc.created_at ASC
    LIMIT 1;

    IF v_multi_company_id IS NOT NULL THEN
      v_company_id := v_multi_company_id;
    END IF;
  END IF;

  -- 5. Fallback por e-mail exato em colaboradores (caso ainda não tenha profile ativo)
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

  -- 7. Busca EXCLUSIVAMENTE dados visuais públicos da empresa (Condicional 1)
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
-- RPC public.get_company_branding_by_slug(p_slug text)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_company_branding_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_ip text;
  v_ip_uuid uuid;
  v_clean_slug text;
  v_brand_name text;
  v_logo_url text;
  v_primary_color text;
  v_favicon_url text;
BEGIN
  v_clean_slug := lower(btrim(p_slug));
  IF v_clean_slug IS NULL OR v_clean_slug = '' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Rate limit (30 requisições por minuto por IP)
  BEGIN
    v_client_ip := coalesce(
      nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
      nullif(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
      '127.0.0.1'
    );
    v_ip_uuid := md5(v_client_ip)::uuid;
    PERFORM public.check_rate_limit(v_ip_uuid, 'branding_login_slug', 30, 60);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('found', false, 'rate_limited', true);
  END;

  SELECT 
    coalesce(c.brand_name, c.name, 'NR-1Comprova') AS brand_name,
    coalesce(c.brand_logo_url, c.logo_url, '/images/nr-1comprova-logo.png?v=2') AS logo_url,
    coalesce(c.brand_primary_color, c.primary_color, '#C8102E') AS primary_color,
    coalesce(c.brand_favicon_url, '/favicon.png') AS favicon_url
  INTO v_brand_name, v_logo_url, v_primary_color, v_favicon_url
  FROM public.companies c
  WHERE c.status = 'active'
    AND (
      lower(btrim(c.name)) = v_clean_slug
      OR lower(btrim(c.brand_name)) = v_clean_slug
      OR (v_clean_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND c.id = v_clean_slug::uuid)
    )
  LIMIT 1;

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

-- Permissões de execução: expostas para anon e authenticated
REVOKE EXECUTE ON FUNCTION public.get_company_branding_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_branding_by_email(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_company_branding_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_branding_by_slug(text) TO anon, authenticated, service_role;
