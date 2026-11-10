-- ============================================================================
-- RPC EM LOTE: check_emails_exist_batch + AJUSTE DE COLUNA CORPORATE_EMAIL
-- Data: 2026-10-21
-- Descrição: 
--   1. Torna corporate_email opcional (DROP NOT NULL) para compatibilidade com importação em massa
--   2. Verifica em UMA consulta em lote os e-mails ocupados em auth.users e colaboradores
-- Segurança: Apenas admin_master, admin_empresa, analista_rh e service_role podem executar.
-- ============================================================================

-- Garante que corporate_email seja opcional caso o colaborador possua apenas email_pessoal
ALTER TABLE public.colaboradores ALTER COLUMN corporate_email DROP NOT NULL;

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
  -- Guarda de autorização: se chamado por usuário autenticado, exige perfil de gestão
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
  active_auth_emails AS (
    SELECT lower(trim(u.email)) AS email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND (p.is_active IS NULL OR p.is_active = true)
      AND lower(trim(u.email)) IN (SELECT norm_email FROM input_emails)
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

REVOKE EXECUTE ON FUNCTION public.check_emails_exist_batch(text[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_emails_exist_batch(text[], uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.check_emails_exist_batch(text[], uuid) IS 
'Verifica em lote se e-mails já estão cadastrados em auth.users ou colaboradores (mesma empresa ou global). Retorna tabela (email, exists).';
