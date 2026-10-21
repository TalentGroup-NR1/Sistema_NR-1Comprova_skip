-- ============================================================================
-- MIGRATION: 20261021190000_multi_role_active_role.sql
-- OBJETIVO: Multi-Perfil Fase 1 — Alternador de Papel Ativo
--           1. Coluna active_role em public.profiles
--           2. RPC set_active_role(p_role app_role) com validação server-side
--           3. get_my_role() com suporte a active_role e fallback seguro
--           4. sync_profile_is_active() limpando active_role no desligamento
-- ============================================================================

-- 1. Coluna active_role em public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role public.app_role;

-- 2. RPC set_active_role
CREATE OR REPLACE FUNCTION public.set_active_role(p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_super boolean;
  v_is_active boolean;
  v_has_role boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Verifica se o perfil existe e está ativo
  SELECT is_active INTO v_is_active
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso negado: perfil inativo ou não encontrado.';
  END IF;

  -- Super admin da plataforma pode alternar livremente (inclusive para fins de simulação)
  SELECT public.is_super_admin(auth.uid()) INTO v_is_super;
  IF v_is_super THEN
    UPDATE public.profiles
    SET active_role = p_role,
        updated_at = now()
    WHERE user_id = auth.uid();
    RETURN;
  END IF;

  -- Valida se o usuário comum realmente possui o papel solicitado em user_roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = p_role
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RAISE EXCEPTION 'Acesso negado: o usuário não possui o papel %', p_role;
  END IF;

  -- Atualiza o active_role no profile
  UPDATE public.profiles
  SET active_role = p_role,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_active_role(app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_role(app_role) TO authenticated, service_role;

-- 3. Atualizar get_my_role()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid;
  v_cid uuid;
  v_active_role app_role;
  v_role app_role;
  v_is_active boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Se o perfil do usuário estiver inativo, não concede papel operacional (fail-closed)
  SELECT is_active, company_id, active_role
  INTO v_is_active, v_cid, v_active_role
  FROM public.profiles
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_is_active IS FALSE THEN
    RETURN NULL;
  END IF;

  -- 2. Super admin da plataforma:
  -- Se definiu um active_role explicitamente, respeita; senão, default 'admin_master'
  IF public.is_super_admin(v_uid) THEN
    RETURN COALESCE(v_active_role, 'admin_master'::app_role);
  END IF;

  -- 3. Se active_role estiver definido, valida se o usuário ainda possui o papel em user_roles
  IF v_active_role IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_uid AND role = v_active_role
    ) THEN
      RETURN v_active_role;
    END IF;
  END IF;

  -- 4. Fallback: Busca o papel associado ao vínculo em user_companies
  IF v_cid IS NOT NULL THEN
    SELECT role INTO v_role
    FROM public.user_companies
    WHERE user_id = v_uid AND company_id = v_cid
    LIMIT 1;

    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  -- 5. Fallback para user_roles legado (ordem de precedência estática)
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_uid
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

-- 4. Atualizar sync_profile_is_active() para limpar active_role no desligamento e na reativação
CREATE OR REPLACE FUNCTION public.sync_profile_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando o colaborador é DESLIGADO, desativa profile, limpa active_role, aplica ban e revoga sessões no Auth
  IF NEW.status = 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_active = false,
        active_role = NULL
    WHERE user_id = NEW.user_id;

    -- Ban no Auth (impede novos logins e renovação de token pelo GoTrue)
    UPDATE auth.users
    SET banned_until = '2999-12-31 23:59:59+00'
    WHERE id = NEW.user_id;

    -- Revoga todas as sessões ativas do usuário
    DELETE FROM auth.sessions WHERE user_id = NEW.user_id;
  END IF;
  
  -- Quando o colaborador é reativado (sai de DESLIGADO), reativa profile, reseta active_role e remove ban
  IF OLD.status = 'DESLIGADO' AND NEW.status != 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_active = true,
        active_role = NULL
    WHERE user_id = NEW.user_id;

    -- Remove ban no Auth para permitir novo login
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;
