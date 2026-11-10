-- ============================================================
-- Migration: Corrigir papel do dev@talentgroup.com.br
-- Objetivo : remover admin_master, manter somente super_admin
-- Segurança: envolto em bloco DO para tolerar banco novo
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Localizar o user_id pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'dev@talentgroup.com.br';

  -- Sair silenciosamente se o usuário ainda não existir
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'dev@talentgroup.com.br não encontrado em auth.users — migration ignorada';
    RETURN;
  END IF;

  -- Passo A: Remover o admin_master (God Mode)
  DELETE FROM public.user_roles
  WHERE user_id = v_user_id
    AND role = 'admin_master';

  RAISE NOTICE 'admin_master removido para user_id=%', v_user_id;

  -- Passo B: Garantir super_admin (idempotente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'super_admin garantido para user_id=%', v_user_id;

  -- Passo C: Desacoplar de empresa cliente (company_id = NULL)
  UPDATE public.profiles
  SET company_id = NULL
  WHERE user_id = v_user_id;

  RAISE NOTICE 'company_id zerado no profile de user_id=%', v_user_id;

END $$;
