-- Migration: Sincronização automática entre public.user_roles e public.user_companies
-- Quando um papel é inserido ou atualizado em user_roles, sincroniza public.user_companies.role
-- para a empresa associada ao perfil do usuário.

CREATE OR REPLACE FUNCTION public.handle_sync_user_role_to_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Não processar super_admin (papel global de plataforma sem company_id direto)
  IF NEW.role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- 1. Busca a company_id do profile do usuário
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- 2. Se o usuário tiver uma empresa no profile, sincroniza ou insere o vínculo em user_companies
  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.user_companies (user_id, company_id, role, is_default)
    VALUES (NEW.user_id, v_company_id, NEW.role, true)
    ON CONFLICT (user_id, company_id)
    DO UPDATE SET 
      role = EXCLUDED.role,
      updated_at = now()
    WHERE user_companies.role IS DISTINCT FROM EXCLUDED.role;
  ELSE
    -- Se o profile ainda não possui company_id definido, mas já existem vínculos em user_companies,
    -- sincroniza os vínculos existentes onde o papel divergir
    UPDATE public.user_companies
    SET role = NEW.role,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND role IS DISTINCT FROM NEW.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role_to_company ON public.user_roles;
CREATE TRIGGER trg_sync_user_role_to_company
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_user_role_to_company();
