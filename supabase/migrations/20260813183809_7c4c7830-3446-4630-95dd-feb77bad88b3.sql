-- 1) Papel de plataforma para Josenildo (mantém admin_master)
-- NOTA: Envolto em exceção — UUID do usuário não existe em banco novo
DO $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('83d39c65-c847-41a7-afca-0a93750539b9', 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
EXCEPTION WHEN foreign_key_violation OR OTHERS THEN NULL;
END $$;

-- 2) Verificação de super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

-- 3) get_my_role por prioridade (ignora super_admin)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
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
$$;

-- 4) Leitura de companies para super admin
DROP POLICY IF EXISTS "Super admin pode ver empresas" ON public.companies;
CREATE POLICY "Super admin pode ver empresas"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- 5) Auditoria da plataforma
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text,
  action text NOT NULL,
  target_company_id uuid,
  target_company_name text,
  ip_address text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.platform_audit_logs TO authenticated;
GRANT ALL ON public.platform_audit_logs TO service_role;

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin le auditoria" ON public.platform_audit_logs;
CREATE POLICY "Super admin le auditoria"
ON public.platform_audit_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin registra auditoria" ON public.platform_audit_logs;
CREATE POLICY "Super admin registra auditoria"
ON public.platform_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin() AND user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at
  ON public.platform_audit_logs (created_at DESC);

-- 6) Suspender / ativar empresa
CREATE OR REPLACE FUNCTION public.suspender_empresa(_company_id uuid, _ativar boolean, _ip text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company record;
  v_new_status text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT id, name, is_internal, status INTO v_company
  FROM public.companies WHERE id = _company_id;

  IF v_company.id IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  IF v_company.is_internal AND NOT _ativar THEN
    RAISE EXCEPTION 'Empresas internas não podem ser suspensas';
  END IF;

  v_new_status := CASE WHEN _ativar THEN 'active' ELSE 'suspended' END;

  UPDATE public.companies
  SET status = v_new_status, updated_at = now()
  WHERE id = _company_id;

  INSERT INTO public.platform_audit_logs (user_id, user_email, action, target_company_id, target_company_name, ip_address, details)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    CASE WHEN _ativar THEN 'empresa_ativada' ELSE 'empresa_suspensa' END,
    _company_id,
    v_company.name,
    _ip,
    jsonb_build_object('status_anterior', v_company.status, 'status_novo', v_new_status)
  );

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suspender_empresa(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suspender_empresa(uuid, boolean, text) TO authenticated;

-- 7) Métricas agregadas
CREATE OR REPLACE FUNCTION public.get_plataforma_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'empresas_ativas', (SELECT count(*) FROM public.companies WHERE status = 'active'),
    'empresas_internas', (SELECT count(*) FROM public.companies WHERE is_internal IS TRUE),
    'empresas_externas', (SELECT count(*) FROM public.companies WHERE is_internal IS NOT TRUE),
    'empresas_suspensas', (SELECT count(*) FROM public.companies WHERE status = 'suspended'),
    'total_usuarios', (SELECT count(*) FROM public.profiles),
    'novos_30_dias', (SELECT count(*) FROM public.companies WHERE created_at >= now() - interval '30 days')
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_plataforma_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plataforma_metrics() TO authenticated;

-- 8) Contagem de colaboradores por empresa (agregado, sem dados pessoais)
CREATE OR REPLACE FUNCTION public.get_plataforma_empresas()
RETURNS TABLE (
  id uuid,
  name text,
  brand_name text,
  cnpj text,
  status text,
  is_internal boolean,
  created_at timestamptz,
  total_colaboradores bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT c.id,
         c.name::text,
         c.brand_name::text,
         c.cnpj::text,
         c.status::text,
         COALESCE(c.is_internal, false),
         c.created_at,
         (SELECT count(*) FROM public.colaboradores col WHERE col.company_id = c.id)
  FROM public.companies c
  ORDER BY c.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_plataforma_empresas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plataforma_empresas() TO authenticated;