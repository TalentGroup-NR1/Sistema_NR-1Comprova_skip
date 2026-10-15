-- Migration: Criar RPC accept_company_terms para coleta probatória de aceite de termos e privacidade
-- no primeiro acesso do cliente (/atualizar-senha).
-- Executada como SECURITY DEFINER para permitir a gravação legítima em terms_acceptance e companies
-- sem expor escrita arbitrária via RLS para usuários não-super-admin.

CREATE OR REPLACE FUNCTION public.accept_company_terms(
  p_terms_version text,
  p_privacy_version text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile record;
  v_existing_id uuid;
  v_ua_clean text;
BEGIN
  -- 1. Validação de autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Salvaguarda: Validação de versões obrigatórias
  IF p_terms_version IS NULL OR trim(p_terms_version) = '' THEN
    RAISE EXCEPTION 'Versão dos termos não pode ser vazia';
  END IF;

  IF p_privacy_version IS NULL OR trim(p_privacy_version) = '' THEN
    RAISE EXCEPTION 'Versão da política de privacidade não pode ser vazia';
  END IF;

  -- 3. Identificar o perfil e empresa do usuário
  SELECT company_id, full_name, email INTO v_profile
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile.company_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de empresa não localizado para este usuário';
  END IF;

  -- Salvaguarda: Truncar user_agent a no máximo 500 caracteres
  v_ua_clean := substr(p_user_agent, 1, 500);

  -- 4. Salvaguarda: Idempotência (não duplicar se já aceitou a mesma versão)
  SELECT id INTO v_existing_id
  FROM public.terms_acceptance
  WHERE company_id = v_profile.company_id
    AND user_id = v_user_id
    AND terms_version = trim(p_terms_version)
    AND privacy_version = trim(p_privacy_version)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Garante desmarcação de must_change_password mesmo em re-execução
    UPDATE public.profiles
    SET must_change_password = false
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'already_accepted', true);
  END IF;

  -- 5. Inserir certidão probatória em terms_acceptance com dados do cliente
  INSERT INTO public.terms_acceptance (
    company_id,
    user_id,
    acceptor_name,
    acceptor_email,
    terms_version,
    privacy_version,
    ip_address,
    user_agent,
    accepted_at
  ) VALUES (
    v_profile.company_id,
    v_user_id,
    COALESCE(v_profile.full_name, 'Administrador'),
    COALESCE(v_profile.email, ''),
    trim(p_terms_version),
    trim(p_privacy_version),
    p_ip_address,
    v_ua_clean,
    now()
  );

  -- 6. Atualizar public.companies com a data e IP do aceite legítimo
  UPDATE public.companies
  SET terms_accepted_at = now(),
      terms_accepted_ip = p_ip_address
  WHERE id = v_profile.company_id;

  -- 7. Desmarcar flag de troca de senha no profile
  UPDATE public.profiles
  SET must_change_password = false
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'already_accepted', false);
END;
$$;

-- Permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.accept_company_terms TO authenticated;
