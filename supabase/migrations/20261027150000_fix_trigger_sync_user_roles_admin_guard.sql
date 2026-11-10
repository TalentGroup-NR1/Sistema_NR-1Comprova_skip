-- Migration: 20261027150000_fix_trigger_sync_user_roles_admin_guard.sql
-- Objetivo:
-- 1. Corrigir trg_sync_user_role_to_company para NUNCA rebaixar admin_empresa para colaborador via sync automático.
--    Regra: se o papel atual em user_companies for admin_empresa e o novo papel for inferior, MANTER admin_empresa.
-- 2. Corrigir vínculo da Gabriela na TG MAIS (restaurando admin_empresa).

CREATE OR REPLACE FUNCTION public.handle_sync_user_role_to_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_existing_role text;
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
    -- Regra de precedência: se já for admin_empresa e o novo papel for inferior, MANTER admin_empresa
    SELECT role INTO v_existing_role
    FROM public.user_companies
    WHERE user_id = NEW.user_id AND company_id = v_company_id;

    IF v_existing_role = 'admin_empresa' AND NEW.role <> 'admin_empresa' THEN
      -- Mantém admin_empresa (o papel administrativo prevalece sobre o funcional)
      RETURN NEW;
    END IF;

    INSERT INTO public.user_companies (user_id, company_id, role, is_default)
    VALUES (NEW.user_id, v_company_id, NEW.role, true)
    ON CONFLICT (user_id, company_id)
    DO UPDATE SET 
      role = EXCLUDED.role,
      updated_at = now()
    WHERE user_companies.role IS DISTINCT FROM EXCLUDED.role
      AND user_companies.role <> 'admin_empresa';
  ELSE
    -- Se o profile ainda não possui company_id definido, mas já existem vínculos em user_companies,
    -- sincroniza apenas onde o papel divergir e NÃO rebaixa admin_empresa
    UPDATE public.user_companies
    SET role = NEW.role,
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND role IS DISTINCT FROM NEW.role
      AND role <> 'admin_empresa';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role_to_company ON public.user_roles;
CREATE TRIGGER trg_sync_user_role_to_company
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sync_user_role_to_company();

-- Atualização específica e pontual da Gabriela na TG MAIS (restaurando admin_empresa)
UPDATE public.user_companies
SET role = 'admin_empresa', updated_at = now()
WHERE user_id = '814e2f42-9b43-4734-ab14-0d2849a85cb5'
  AND company_id = '4553d74e-90d6-4988-b529-853b8b8db993';
