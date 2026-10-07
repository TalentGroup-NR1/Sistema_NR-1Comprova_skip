-- Create table for module visibility per role per tenant
CREATE TABLE IF NOT EXISTS public.module_visibility (
  company_id uuid references public.companies(id) on delete cascade not null,
  role app_role not null,
  module_key text not null,
  visible boolean not null default true,
  PRIMARY KEY (company_id, role, module_key)
);

ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage module_visibility" ON public.module_visibility
  FOR ALL
  USING (
    (has_role(auth.uid(), 'admin_empresa') OR has_role(auth.uid(), 'admin_master')) AND
    company_id = (SELECT c.company_id FROM public.profiles c WHERE c.user_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin_empresa') OR has_role(auth.uid(), 'admin_master')) AND
    company_id = (SELECT c.company_id FROM public.profiles c WHERE c.user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Users can read module_visibility for their company" ON public.module_visibility
  FOR SELECT
  USING (
    company_id = (SELECT c.company_id FROM public.profiles c WHERE c.user_id = auth.uid() LIMIT 1)
  );

-- RPC for secure retrieval of visibility configs for current user's role
CREATE OR REPLACE FUNCTION public.get_visible_modules(p_company_id uuid)
RETURNS TABLE (module_key text, visible boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_role app_role;
    v_my_company_id uuid;
BEGIN
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    SELECT company_id INTO v_my_company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

    -- Multi-tenant boundary
    IF v_my_company_id IS NULL OR v_my_company_id != p_company_id THEN
        RETURN;
    END IF;

    -- Admins (master e empresa) always see everything (fallback)
    IF v_user_role IN ('admin_master', 'admin_empresa', 'super_admin') THEN
        RETURN;
    END IF;

    RETURN QUERY 
    SELECT mv.module_key, mv.visible 
    FROM public.module_visibility mv 
    WHERE mv.company_id = p_company_id 
      AND mv.role = v_user_role;
END;
$$;
