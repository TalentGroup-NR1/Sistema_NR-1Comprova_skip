CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  completed_steps text[] NOT NULL DEFAULT '{}',
  dismissed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select_own_company"
ON public.onboarding_progress FOR SELECT TO authenticated
USING (company_id = public.get_my_company_id());

CREATE POLICY "onboarding_insert_own_company"
ON public.onboarding_progress FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
);

CREATE POLICY "onboarding_update_own_company"
ON public.onboarding_progress FOR UPDATE TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('admin_empresa','analista_rh')
);

CREATE TRIGGER update_onboarding_progress_updated_at
BEFORE UPDATE ON public.onboarding_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();