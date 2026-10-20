-- Migration: 20261020180000_admin_update_user_role.sql
-- Objetivo: RPC atômica para alteração de perfil de usuário ativo (correção de erro inicial ou promoção).
-- Regras de Segurança:
-- 1. SECURITY DEFINER com search_path seguro ('public', 'pg_temp').
-- 2. Caller autenticado (auth.uid() NOT NULL).
-- 3. Proíbe auto-alteração (auth.uid() <> p_user_id).
-- 4. Validação estrita de permissões: admin_master, super_admin ou admin_empresa vinculado a p_company_id.
-- 5. Atualização atômica em user_companies (fonte única de verdade) E user_roles (sincronização legada).
-- 6. NÃO toca em auth.users, senhas ou e-mails.

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

    -- Admin empresa só pode atribuir colaborador, gestor_departamento ou analista_rh
    IF p_new_role NOT IN ('colaborador', 'gestor_departamento', 'analista_rh') THEN
      RAISE EXCEPTION 'Permissão negada: administradores de empresa só podem atribuir colaborador, gestor de departamento ou analista de RH';
    END IF;
  END IF;

  -- 5. Atualização atômica nas duas tabelas
  -- 5.1 user_companies (fonte única de verdade do vínculo)
  UPDATE public.user_companies
  SET role = p_new_role, updated_at = now()
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- 5.2 user_roles (sincronização para tabela administrativa e compatibilidade)
  UPDATE public.user_roles
  SET role = p_new_role
  WHERE user_id = p_user_id AND role <> 'super_admin';

  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_new_role)
    ON CONFLICT (user_id, role) DO NOTHING;
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

-- Permissões estritas: apenas usuários autenticados podem invocar
REVOKE ALL ON FUNCTION public.admin_update_user_role(uuid, uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, uuid, app_role) TO authenticated;

-- Garante que todas as empresas (incluindo as criadas recentemente) possuam as restrições deliberadas da NR-1 para gestores
INSERT INTO public.module_visibility (company_id, role, module_key, visible)
  SELECT c.id, 'gestor_departamento'::app_role, m.module_key, false
  FROM public.companies c CROSS JOIN (VALUES
    ('/estrutura-organizacional'),
    ('/mapa-riscos-nr1')
  ) AS m(module_key)
  ON CONFLICT (company_id, role, module_key) DO NOTHING;

