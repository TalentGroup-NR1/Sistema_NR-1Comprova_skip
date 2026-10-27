-- Migration: 20261027151000_admin_update_user_role_last_admin_guard.sql
-- Objetivo:
-- 1. Permitir que admin_empresa gerencie membros da empresa (inclusive outro admin_empresa).
-- 2. Implementar Salvaguarda do Último Admin (bloqueia rebaixamento do último admin_empresa ativo).
-- 3. Permitir que admin_empresa atribua perfis da empresa (admin_empresa, gestor_departamento, analista_rh, colaborador).

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id uuid,
  p_company_id uuid,
  p_new_role app_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id uuid;
  v_is_super boolean;
  v_is_master boolean;
  v_is_company_admin boolean;
  v_target_curr_role app_role;
  v_admin_count integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 1. Bloquear auto-alteração deliberadamente
  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Operação não permitida: administradores não podem alterar o próprio papel';
  END IF;

  -- 2. Validar perfil do chamador
  SELECT public.is_super_admin(v_caller_id) INTO v_is_super;

  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = v_caller_id AND role = 'admin_master'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller_id AND role = 'admin_master'
  ) INTO v_is_master;

  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = v_caller_id
      AND company_id = p_company_id
      AND role = 'admin_empresa'
  ) INTO v_is_company_admin;

  IF NOT (COALESCE(v_is_super, false) OR COALESCE(v_is_master, false) OR COALESCE(v_is_company_admin, false)) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores da empresa ou administradores mestres podem alterar perfis';
  END IF;

  -- 3. Verificar existência do vínculo do usuário-alvo na empresa especificada
  SELECT role INTO v_target_curr_role
  FROM public.user_companies
  WHERE user_id = p_user_id AND company_id = p_company_id;

  IF v_target_curr_role IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui vínculo ativo com a empresa especificada';
  END IF;

  -- 4. Restrições específicas para admin_empresa
  IF NOT (COALESCE(v_is_super, false) OR COALESCE(v_is_master, false)) THEN
    -- Admin empresa não pode alterar admin_master ou super_admin
    IF v_target_curr_role IN ('admin_master') OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role IN ('admin_master', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Permissão negada: administradores de empresa não podem alterar administradores mestres';
    END IF;

    -- Admin empresa só pode atribuir papéis válidos da empresa
    IF p_new_role NOT IN ('admin_empresa', 'colaborador', 'gestor_departamento', 'analista_rh') THEN
      RAISE EXCEPTION 'Permissão negada: administradores de empresa só podem atribuir perfis da empresa (admin_empresa, gestor_departamento, analista_rh, colaborador)';
    END IF;
  END IF;

  -- 5. Salvaguarda do Último Admin:
  -- NUNCA permitir rebaixar o último admin da empresa
  IF v_target_curr_role = 'admin_empresa' AND p_new_role <> 'admin_empresa' THEN
    SELECT count(*) INTO v_admin_count
    FROM public.user_companies
    WHERE company_id = p_company_id AND role = 'admin_empresa';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Operação bloqueada: a empresa deve possuir pelo menos um Administrador ativo.';
    END IF;
  END IF;

  -- 6. Atualização atômica em user_companies
  UPDATE public.user_companies
  SET role = p_new_role, updated_at = now()
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- 7. Sincronização em user_roles
  IF p_new_role = 'admin_empresa' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'admin_empresa')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Se o novo papel não for admin_empresa, só remove/atualiza admin_empresa em user_roles
    -- se o usuário NÃO for admin_empresa em outra empresa vinculada
    IF NOT EXISTS (
      SELECT 1 FROM public.user_companies
      WHERE user_id = p_user_id
        AND company_id <> p_company_id
        AND role = 'admin_empresa'
    ) THEN
      UPDATE public.user_roles
      SET role = p_new_role
      WHERE user_id = p_user_id AND role <> 'super_admin';

      IF NOT FOUND THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, p_new_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    ELSE
      -- Usuário ainda é admin_empresa em outra empresa vinculada; mantém admin_empresa e garante novo papel
      INSERT INTO public.user_roles (user_id, role)
      VALUES (p_user_id, p_new_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'company_id', p_company_id,
    'previous_role', v_target_curr_role,
    'new_role', p_new_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(uuid, uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, uuid, app_role) TO authenticated, service_role;
