-- ============================================================================
-- MIGRATION: 20261021200000_set_active_company_reset_role.sql
-- OBJETIVO: Multi-Perfil Fase 1 (Etapa 4) — Multi-Tenant:
--           Ao alternar de empresa via set_active_company(), reseta active_role
--           para NULL no profile, garantindo que get_my_role() resolva
--           imediatamente para o papel padrão da empresa destino (user_companies).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_active_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_link boolean;
  v_is_super boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT public.is_super_admin(auth.uid()) INTO v_is_super;

  -- Se não for super_admin da plataforma, exige vínculo explícito em user_companies
  IF NOT v_is_super THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_companies
      WHERE user_id = auth.uid() AND company_id = p_company_id
    ) INTO v_has_link;

    IF NOT v_has_link THEN
      RAISE EXCEPTION 'Acesso negado: usuário não possui vínculo ativo com esta empresa.';
    END IF;
  END IF;

  -- Sincroniza profiles.company_id e reseta active_role para que get_my_role()
  -- resolva para o papel padrão da empresa destino configurado em user_companies
  UPDATE public.profiles
  SET company_id = p_company_id,
      active_role = NULL,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_active_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_company(uuid) TO authenticated, service_role;
