-- Migration: Blindagem do Desligamento (Etapa 3)
-- 1. has_company_access() exige profiles.is_active = true (fail-closed para JWTs existentes)
-- 2. get_my_company_id() e get_my_role() retornam NULL para perfis inativos
-- 3. sync_profile_is_active() revoga sessões em auth.sessions e aplica ban temporário em auth.users.banned_until
-- 4. Reativação restaura profiles.is_active = true e limpa o ban no Auth

-- 1. has_company_access
CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (
    public.is_super_admin(auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.is_active = true
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.user_companies uc
          WHERE uc.user_id = auth.uid()
            AND uc.company_id = _company_id
        )
        OR (_company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_active = true LIMIT 1))
      )
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_company_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO authenticated, service_role;

-- 2. get_my_company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  _cid text;
  _uid uuid;
  _res uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Se o perfil do usuário estiver inativo (ex.: colaborador desligado), fail-closed
  IF NOT public.is_super_admin(_uid) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = _uid AND p.is_active = false
  ) THEN
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
$function$;

-- 3. get_my_role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_cid uuid;
  v_role app_role;
BEGIN
  -- Super admin da plataforma
  IF public.is_super_admin(auth.uid()) THEN
    RETURN 'admin_master'::app_role;
  END IF;

  -- Se o perfil do usuário estiver inativo, não concede papel operacional
  IF EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_active = false
  ) THEN
    RETURN NULL;
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

  -- Fallback para user_roles legado
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
$function$;

-- 4. sync_profile_is_active
CREATE OR REPLACE FUNCTION public.sync_profile_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando o colaborador é DESLIGADO, desativa profile, aplica ban e revoga sessões no Auth
  IF NEW.status = 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_active = false WHERE user_id = NEW.user_id;

    -- Ban no Auth (impede novos logins e renovação de token pelo GoTrue)
    UPDATE auth.users
    SET banned_until = '2999-12-31 23:59:59+00'
    WHERE id = NEW.user_id;

    -- Revoga todas as sessões ativas do usuário
    DELETE FROM auth.sessions WHERE user_id = NEW.user_id;
  END IF;
  
  -- Quando o colaborador é reativado (sai de DESLIGADO), reativa profile e remove ban
  IF OLD.status = 'DESLIGADO' AND NEW.status != 'DESLIGADO' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_active = true WHERE user_id = NEW.user_id;

    -- Remove ban no Auth para permitir novo login
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 5. get_user_company_id (exige perfil ativo)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
    AND is_active = true
$function$;

-- 6. has_role (exige perfil ativo)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT (
    (_role = 'admin_master' AND public.is_super_admin(_user_id))
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = _user_id
          AND p.is_active = true
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
      )
    )
  );
$function$;

-- 7. get_user_role (exige perfil ativo)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_active = false) THEN NULL
    ELSE (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
  END
$function$;

-- 8. Colaboradores can view their own record (somente se perfil estiver ativo)
DROP POLICY IF EXISTS "Colaboradores can view their own record" ON public.colaboradores;
CREATE POLICY "Colaboradores can view their own record"
ON public.colaboradores
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_active = true))
  OR admin_master_scope(company_id)
  OR (
    get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh')
    AND company_id = get_user_company_id(auth.uid())
  )
  OR (
    get_user_role(auth.uid()) = 'gestor_departamento'
    AND company_id = get_user_company_id(auth.uid())
    AND gestor_id = get_my_colaborador_id()
  )
);
