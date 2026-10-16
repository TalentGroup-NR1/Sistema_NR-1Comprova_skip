-- ============================================================================
-- GUARD DE E-MAIL: RPC check_email_exists + Sincronização profiles.email
-- Data: 2026-10-16
-- 
-- 1. Sincroniza profiles.email para perfis onde o campo está nulo
-- 2. Cria RPC SECURITY DEFINER check_email_exists(text) que verifica se
--    o e-mail já pertence a uma conta ATIVA na plataforma (auth.users + profiles)
-- ============================================================================

-- Sincronizar profiles.email a partir de auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email = '');

-- RPC para checagem segura de existência de conta ativa (sem vazar PII nem tenant)
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE lower(u.email) = lower(trim(p_email))
      AND u.deleted_at IS NULL
      AND (p.is_active IS NULL OR p.is_active = true)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.check_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated, service_role;
