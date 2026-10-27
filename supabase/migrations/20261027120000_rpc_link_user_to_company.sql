-- ============================================================================
-- RPC: link_user_to_company
-- Permite vincular um usuário existente a uma nova empresa com validação
-- estrita de escopo multi-tenant (apenas admin_empresa da empresa alvo ou master).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_user_to_company(
  p_user_id uuid,
  p_company_id uuid,
  p_role app_role,
  p_is_default boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_is_master boolean;
  v_is_target_admin boolean;
  v_company_name text;
  v_user_email text;
  v_existing_id uuid;
  v_new_link_id uuid;
BEGIN
  -- 1. Fail-closed se não autenticado
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- 2. Verificar papel master
  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller_uid
        AND role IN ('admin_master', 'super_admin')
    )
  ) INTO v_is_master;

  -- 3. Se não for master, verificar se é admin_empresa da empresa alvo
  IF NOT v_is_master THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_companies
      WHERE user_id = v_caller_uid
        AND company_id = p_company_id
        AND role = 'admin_empresa'
    ) INTO v_is_target_admin;

    IF NOT v_is_target_admin THEN
      RAISE EXCEPTION 'Acesso negado: você não tem permissão para vincular usuários a esta empresa.';
    END IF;
  END IF;

  -- 4. Validar existência da empresa alvo
  SELECT name INTO v_company_name
  FROM public.companies
  WHERE id = p_company_id AND status = 'active';

  IF v_company_name IS NULL THEN
    RAISE EXCEPTION 'Empresa alvo não encontrada ou inativa.';
  END IF;

  -- 5. Validar existência do usuário alvo
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- 6. Verificar duplicidade de vínculo
  SELECT id INTO v_existing_id
  FROM public.user_companies
  WHERE user_id = p_user_id AND company_id = p_company_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário já possui vínculo ativo com a empresa ' || v_company_name
    );
  END IF;

  -- 7. Se is_default, desmarcar demais vínculos
  IF p_is_default THEN
    UPDATE public.user_companies
    SET is_default = false
    WHERE user_id = p_user_id;
  END IF;

  -- 8. Inserir vínculo
  INSERT INTO public.user_companies (user_id, company_id, role, is_default)
  VALUES (p_user_id, p_company_id, p_role, p_is_default)
  RETURNING id INTO v_new_link_id;

  -- 9. Auditoria
  INSERT INTO public.platform_audit_logs (
    action,
    user_id,
    target_company_id,
    details
  ) VALUES (
    'vinculo_multiempresa_adicionado',
    v_caller_uid,
    p_company_id,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_user_email', v_user_email,
      'company_name', v_company_name,
      'role', p_role,
      'is_default', p_is_default,
      'operador_id', v_caller_uid,
      'created_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuário vinculado a ' || v_company_name || ' com sucesso!',
    'link_id', v_new_link_id,
    'company_name', v_company_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_user_to_company(uuid, uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_user_to_company(uuid, uuid, app_role, boolean) TO authenticated;
