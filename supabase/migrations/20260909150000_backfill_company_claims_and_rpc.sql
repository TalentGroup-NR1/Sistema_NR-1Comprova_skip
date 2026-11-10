-- ============================================================
-- Migration: Backfill de claims de company_id para auth.users,
--            tornar get_my_company_id() explícita e tolerante a fallbacks,
--            e garantir que atualizar_branding_empresa lance erro claro (GA402)
--            e grave onboarding_progress no mesmo clique.
-- ============================================================

-- 1. Backfill em public.profiles para admin_empresa cujo company_id está NULL
UPDATE public.profiles p
SET company_id = c.id
FROM public.companies c
JOIN auth.users u ON lower(u.email) = lower(c.email)
JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin_empresa'
WHERE p.user_id = u.id
  AND p.company_id IS NULL;

-- 2. Backfill em auth.users (raw_app_meta_data e raw_user_meta_data)
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('company_id', comp.company_id, 'role', 'admin_empresa'),
    raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('company_id', comp.company_id)
FROM (
  -- Origem A: company_id registrado no profile
  SELECT p.user_id, p.company_id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'admin_empresa'
  WHERE p.company_id IS NOT NULL

  UNION

  -- Origem B: empresa vinculada por e-mail correspondente
  SELECT u2.id AS user_id, c.id AS company_id
  FROM auth.users u2
  JOIN public.companies c ON lower(c.email) = lower(u2.email)
  JOIN public.user_roles ur2 ON ur2.user_id = u2.id AND ur2.role = 'admin_empresa'
) comp
WHERE u.id = comp.user_id
  AND (
    u.raw_app_meta_data->>'company_id' IS NULL
    OR u.raw_app_meta_data->>'company_id' = ''
    OR u.raw_user_meta_data->>'company_id' IS NULL
    OR u.raw_user_meta_data->>'company_id' = ''
  );

-- 3. Função get_my_company_id() robusta com múltiplos níveis de resolução
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  _cid text;
  _uid uuid;
  _res uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1) Claim no JWT (app_metadata -> company_id)
  _cid := auth.jwt() -> 'app_metadata' ->> 'company_id';
  IF _cid IS NOT NULL AND _cid <> '' THEN
    RETURN _cid::uuid;
  END IF;

  -- 2) Claim no JWT (user_metadata -> company_id)
  _cid := auth.jwt() -> 'user_metadata' ->> 'company_id';
  IF _cid IS NOT NULL AND _cid <> '' THEN
    RETURN _cid::uuid;
  END IF;

  -- 3) auth.users.raw_app_meta_data
  SELECT NULLIF(raw_app_meta_data->>'company_id', '')::uuid
  INTO _res
  FROM auth.users
  WHERE id = _uid;

  IF _res IS NOT NULL THEN
    RETURN _res;
  END IF;

  -- 4) auth.users.raw_user_meta_data
  SELECT NULLIF(raw_user_meta_data->>'company_id', '')::uuid
  INTO _res
  FROM auth.users
  WHERE id = _uid;

  IF _res IS NOT NULL THEN
    RETURN _res;
  END IF;

  -- 5) public.profiles
  SELECT company_id
  INTO _res
  FROM public.profiles
  WHERE user_id = _uid
  LIMIT 1;

  IF _res IS NOT NULL THEN
    RETURN _res;
  END IF;

  -- 6) public.companies por e-mail do usuário
  SELECT c.id
  INTO _res
  FROM public.companies c
  JOIN auth.users u ON lower(u.email) = lower(c.email)
  WHERE u.id = _uid
  LIMIT 1;

  RETURN _res;
END;
$$;

-- 4. Função auxiliar para sincronizar claim do usuário autenticado sob demanda
CREATE OR REPLACE FUNCTION public.sincronizar_claim_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  _uid uuid;
  _comp_id uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  _comp_id := public.get_my_company_id();
  IF _comp_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('company_id', _comp_id),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('company_id', _comp_id)
    WHERE id = _uid;

    UPDATE public.profiles
    SET company_id = _comp_id
    WHERE user_id = _uid AND company_id IS NULL;
  END IF;

  RETURN _comp_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sincronizar_claim_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_claim_company_id() TO authenticated;

-- 5. Atualização da RPC atualizar_branding_empresa com erro GA402 explícito e gravação atômica de onboarding_progress
DROP FUNCTION IF EXISTS public.atualizar_branding_empresa(text, text, text);
DROP FUNCTION IF EXISTS public.atualizar_branding_empresa(text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.atualizar_branding_empresa(
  _brand_name text DEFAULT NULL,
  _brand_primary_color text DEFAULT NULL,
  _brand_logo_url text DEFAULT NULL,
  _cnpj text DEFAULT NULL,
  _remove_logo boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _company uuid;
  _clean_cnpj text;
  _rows_updated int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin_empresa') OR public.has_role(auth.uid(), 'analista_rh')
          OR public.has_role(auth.uid(), 'admin_master')) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  _company := public.get_my_company_id();
  IF _company IS NULL THEN
    RAISE EXCEPTION 'GA402: Empresa não identificada (claim company_id ausente no token do usuário)';
  END IF;

  IF _brand_primary_color IS NOT NULL AND _brand_primary_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor inválida';
  END IF;

  -- Se CNPJ foi fornecido, valida unicidade em relação a outras empresas
  IF _cnpj IS NOT NULL AND btrim(_cnpj) <> '' THEN
    _clean_cnpj := btrim(_cnpj);
    IF EXISTS (
      SELECT 1 FROM public.companies
      WHERE id <> _company
        AND (
          cnpj = _clean_cnpj
          OR regexp_replace(cnpj, '\D', '', 'g') = regexp_replace(_clean_cnpj, '\D', '', 'g')
        )
    ) THEN
      RAISE EXCEPTION 'CNPJ já cadastrado em outra empresa';
    END IF;
  END IF;

  UPDATE public.companies
  SET brand_name = CASE
        WHEN _brand_name IS NOT NULL THEN NULLIF(btrim(_brand_name), '')
        ELSE brand_name
      END,
      name = CASE
        WHEN _brand_name IS NOT NULL AND NULLIF(btrim(_brand_name), '') IS NOT NULL THEN btrim(_brand_name)
        ELSE name
      END,
      brand_primary_color = COALESCE(_brand_primary_color, brand_primary_color),
      brand_logo_url = CASE
        WHEN _remove_logo THEN NULL
        WHEN _brand_logo_url IS NOT NULL THEN NULLIF(btrim(_brand_logo_url), '')
        ELSE brand_logo_url
      END,
      logo_url = CASE
        WHEN _remove_logo THEN NULL
        WHEN _brand_logo_url IS NOT NULL THEN NULLIF(btrim(_brand_logo_url), '')
        ELSE logo_url
      END,
      cnpj = CASE
        WHEN _clean_cnpj IS NOT NULL THEN _clean_cnpj
        ELSE cnpj
      END,
      updated_at = now()
  WHERE id = _company;

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;
  IF _rows_updated = 0 THEN
    RAISE EXCEPTION 'GA404: Nenhuma empresa encontrada com id % para atualização', _company;
  END IF;

  -- Grava/conclui progresso de onboarding no mesmo clique
  INSERT INTO public.onboarding_progress (company_id, current_step, completed_steps, completed_at, dismissed)
  VALUES (_company, 0, ARRAY['branding'], now(), true)
  ON CONFLICT (company_id) DO UPDATE
  SET current_step = 0,
      completed_steps = ARRAY['branding'],
      completed_at = COALESCE(public.onboarding_progress.completed_at, now()),
      dismissed = true;

  RETURN _company;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_branding_empresa(text, text, text, text, boolean) TO authenticated;
