-- ============================================================================
-- MIGRATION: 20261021220000_guard_inteligente_vinculacao.sql
-- Data: 2026-10-21
-- Descrição: 
--   1. RPC check_email_vinculacao: verifica elegibilidade de vinculação de conta
--      existente da MESMA empresa para ficha funcional de colaborador.
--   2. Atualização de check_emails_exist_batch: não rejeita e-mails de admins da
--      mesma empresa sem ficha em colaboradores (permite vinculação na importação).
--   3. Trigger trg_auto_link_colaborador_user: vincula automaticamente user_id da
--      mesma empresa e concede role 'colaborador' em user_roles de forma atômica.
-- ============================================================================

-- 1. RPC para validação e verificação de vinculação inteligente de e-mail
CREATE OR REPLACE FUNCTION public.check_email_vinculacao(
  p_email text,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_norm_email text;
  v_user_id uuid;
  v_user_company_id uuid;
  v_user_name text;
  v_is_active boolean;
  v_colab_exists boolean;
BEGIN
  -- Guarda de autorização: apenas usuários autenticados com papéis de gestão podem consultar
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin_master', 'admin_empresa', 'analista_rh')
    ) THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores e analistas de RH podem consultar status de vinculação.';
    END IF;
  END IF;

  v_norm_email := lower(trim(p_email));

  IF v_norm_email IS NULL OR v_norm_email = '' THEN
    RETURN jsonb_build_object(
      'can_link', false,
      'is_occupied', false,
      'reason', 'empty_email',
      'user_id', null,
      'user_name', null
    );
  END IF;

  -- 1. Buscar usuário ativo em auth.users + profiles
  SELECT 
    u.id,
    p.company_id,
    p.full_name,
    COALESCE(p.is_active, true)
  INTO 
    v_user_id,
    v_user_company_id,
    v_user_name,
    v_is_active
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(u.email) = v_norm_email
    AND u.deleted_at IS NULL
  LIMIT 1;

  -- Se não existe usuário em auth.users: e-mail livre e disponível para novo cadastro
  IF v_user_id IS NULL THEN
    -- Verifica se já existe em colaboradores na mesma empresa
    SELECT EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.company_id = p_company_id
        AND (lower(c.email_pessoal) = v_norm_email OR lower(c.corporate_email) = v_norm_email)
    ) INTO v_colab_exists;

    IF v_colab_exists THEN
      RETURN jsonb_build_object(
        'can_link', false,
        'is_occupied', true,
        'reason', 'already_in_company_colaboradores',
        'user_id', null,
        'user_name', null
      );
    END IF;

    RETURN jsonb_build_object(
      'can_link', false,
      'is_occupied', false,
      'reason', 'available',
      'user_id', null,
      'user_name', null
    );
  END IF;

  -- Se o usuário do auth está inativo/desligado:
  IF NOT v_is_active THEN
    RETURN jsonb_build_object(
      'can_link', false,
      'is_occupied', true,
      'reason', 'user_inactive',
      'user_id', null,
      'user_name', null
    );
  END IF;

  -- Se o usuário pertence a OUTRA empresa: BLOQUEIO MULTI-TENANT ESTRITO
  IF v_user_company_id IS NULL OR v_user_company_id <> p_company_id THEN
    RETURN jsonb_build_object(
      'can_link', false,
      'is_occupied', true,
      'reason', 'other_company',
      'user_id', null,
      'user_name', null
    );
  END IF;

  -- Se pertence à MESMA empresa, checar se já tem ficha em colaboradores
  SELECT EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.company_id = p_company_id
      AND (
        c.user_id = v_user_id 
        OR lower(c.email_pessoal) = v_norm_email 
        OR lower(c.corporate_email) = v_norm_email
      )
  ) INTO v_colab_exists;

  IF v_colab_exists THEN
    RETURN jsonb_build_object(
      'can_link', false,
      'is_occupied', true,
      'reason', 'already_linked',
      'user_id', v_user_id,
      'user_name', v_user_name
    );
  END IF;

  -- Pertence à MESMA empresa e NÃO possui ficha em colaboradores: VINCULAÇÃO PERMITIDA!
  RETURN jsonb_build_object(
    'can_link', true,
    'is_occupied', false,
    'reason', 'same_company_linkable',
    'user_id', v_user_id,
    'user_name', v_user_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_email_vinculacao(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_vinculacao(text, uuid) TO authenticated, service_role;


-- 2. Atualizar check_emails_exist_batch para não marcar como ocupado e-mails vinculáveis da mesma empresa
CREATE OR REPLACE FUNCTION public.check_emails_exist_batch(
  p_emails text[],
  p_company_id uuid DEFAULT NULL
)
RETURNS TABLE(email text, "exists" boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin_master', 'admin_empresa', 'analista_rh')
    ) THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores e analistas de RH podem consultar e-mails em lote.';
    END IF;
  END IF;

  RETURN QUERY
  WITH input_emails AS (
    SELECT DISTINCT lower(trim(e)) AS norm_email
    FROM unnest(p_emails) AS e
    WHERE e IS NOT NULL AND trim(e) <> ''
  ),
  -- Usuários em auth.users que NÃO são vinculáveis na empresa atual
  active_auth_emails AS (
    SELECT lower(trim(u.email)) AS email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND (p.is_active IS NULL OR p.is_active = true)
      AND lower(trim(u.email)) IN (SELECT norm_email FROM input_emails)
      -- Se p_company_id foi fornecido, exclui contas da MESMA empresa que NÃO possuem colaborador
      -- (essas contas são elegíveis para vinculação, portanto 'exists' = false no batch de rejeição)
      AND NOT (
        p_company_id IS NOT NULL 
        AND p.company_id = p_company_id
        AND NOT EXISTS (
          SELECT 1 FROM public.colaboradores c 
          WHERE c.company_id = p_company_id 
            AND (c.user_id = u.id OR lower(c.email_pessoal) = lower(u.email) OR lower(c.corporate_email) = lower(u.email))
        )
      )
  ),
  colab_emails AS (
    SELECT lower(trim(c.email_pessoal)) AS email
    FROM public.colaboradores c
    WHERE c.email_pessoal IS NOT NULL
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND lower(trim(c.email_pessoal)) IN (SELECT norm_email FROM input_emails)
    UNION
    SELECT lower(trim(c.corporate_email)) AS email
    FROM public.colaboradores c
    WHERE c.corporate_email IS NOT NULL
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND lower(trim(c.corporate_email)) IN (SELECT norm_email FROM input_emails)
  ),
  occupied_emails AS (
    SELECT o.email FROM active_auth_emails o
    UNION
    SELECT c.email FROM colab_emails c
  )
  SELECT
    ie.norm_email AS email,
    (oe.email IS NOT NULL) AS "exists"
  FROM input_emails ie
  LEFT JOIN occupied_emails oe ON ie.norm_email = oe.email;
END;
$$;


-- 3. Trigger para autovinculação e concessão da role 'colaborador' ao inserir na tabela colaboradores
CREATE OR REPLACE FUNCTION public.trg_auto_link_colaborador_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_matched_user_id uuid;
  v_user_company_id uuid;
  v_is_active boolean;
BEGIN
  -- Se user_id já foi explicitamente informado:
  IF NEW.user_id IS NOT NULL THEN
    -- Validação de segurança multi-tenant: o usuário precisa pertencer à mesma empresa
    SELECT company_id, COALESCE(is_active, true) 
    INTO v_user_company_id, v_is_active
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    IF v_user_company_id IS NOT NULL AND v_user_company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'Violação de segurança multi-tenant: não é permitido vincular colaborador a usuário de outra empresa.';
    END IF;

    -- Conceder role 'colaborador' em user_roles se o usuário ainda não tiver
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'colaborador')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
  END IF;

  -- Se user_id é NULL, verificar se o e-mail (pessoal ou corporativo) coincide com admin ativo da mesma empresa
  IF NEW.email_pessoal IS NOT NULL OR NEW.corporate_email IS NOT NULL THEN
    SELECT 
      u.id, 
      p.company_id, 
      COALESCE(p.is_active, true)
    INTO 
      v_matched_user_id, 
      v_user_company_id, 
      v_is_active
    FROM auth.users u
    JOIN public.profiles p ON p.user_id = u.id
    WHERE (
      (NEW.email_pessoal IS NOT NULL AND lower(u.email) = lower(trim(NEW.email_pessoal)))
      OR
      (NEW.corporate_email IS NOT NULL AND lower(u.email) = lower(trim(NEW.corporate_email)))
    )
    AND u.deleted_at IS NULL
    AND p.company_id = NEW.company_id
    LIMIT 1;

    IF v_matched_user_id IS NOT NULL AND v_is_active THEN
      -- Vincula automaticamente ao user_id do admin da mesma empresa
      NEW.user_id := v_matched_user_id;

      -- Concede role 'colaborador' em user_roles
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_matched_user_id, 'colaborador')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_colaborador_user ON public.colaboradores;
CREATE TRIGGER trg_auto_link_colaborador_user
BEFORE INSERT ON public.colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_link_colaborador_user();
