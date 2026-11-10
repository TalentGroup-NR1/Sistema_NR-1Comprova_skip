CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  acceptor_name text NOT NULL,
  acceptor_email text NOT NULL,
  terms_version text NOT NULL DEFAULT '1.0',
  privacy_version text NOT NULL DEFAULT '1.0',
  ip_address text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.terms_acceptance TO authenticated;
GRANT ALL ON public.terms_acceptance TO service_role;

ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_terms" ON public.terms_acceptance
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "admin_read_own_terms" ON public.terms_acceptance
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_company ON public.terms_acceptance(company_id);