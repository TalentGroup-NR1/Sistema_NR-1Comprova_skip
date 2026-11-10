-- ============================================================================
-- MIGRATION: 20261027140000_rpc_get_company_users.sql
-- OBJETIVO: RPC segura (SECURITY DEFINER) para listar membros de uma empresa
--           a partir de user_companies com papel contextual (role) e dados de perfil,
--           validando estritamente se o chamador possui vínculo com a empresa.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_company_users(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  company_id uuid,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  role app_role,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_service boolean;
  v_is_super boolean;
  v_has_access boolean;
BEGIN
  v_is_service := (auth.role() = 'service_role');

  -- 1. Se não for service_role, exige autenticação e autorização
  IF NOT v_is_service THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Não autenticado';
    END IF;

    v_is_super := public.is_super_admin(auth.uid());

    IF NOT v_is_super THEN
      SELECT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = auth.uid() AND uc.company_id = p_company_id
      ) INTO v_has_access;

      IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado: usuário não possui vínculo ativo com esta empresa.';
      END IF;
    END IF;
  END IF;

  -- 2. Retorno dos membros da empresa a partir de user_companies (canônico)
  RETURN QUERY
  SELECT
    COALESCE(p.id, uc.id) AS id,
    uc.user_id,
    COALESCE(p.full_name, 'Sem nome')::text AS full_name,
    COALESCE(p.email, u.email::text)::text AS email,
    p.phone::text AS phone,
    p.avatar_url::text AS avatar_url,
    p_company_id AS company_id,
    COALESCE(p.is_active, true) AS is_active,
    COALESCE(uc.created_at, p.created_at) AS created_at,
    COALESCE(uc.updated_at, p.updated_at) AS updated_at,
    uc.role,
    c.name::text AS company_name
  FROM public.user_companies uc
  LEFT JOIN public.profiles p ON p.user_id = uc.user_id
  LEFT JOIN auth.users u ON u.id = uc.user_id
  LEFT JOIN public.companies c ON c.id = uc.company_id
  WHERE uc.company_id = p_company_id
  ORDER BY uc.created_at DESC;
END;
$$;

-- Permissões estritas: apenas usuários autenticados e service_role
REVOKE EXECUTE ON FUNCTION public.get_company_users(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_users(uuid) TO authenticated, service_role;
