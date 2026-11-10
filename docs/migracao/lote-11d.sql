SET check_function_bodies = false;

-- ============ 9. platform_audit_logs ============
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text,
  action text NOT NULL,
  target_company_id uuid,
  target_company_name text,
  ip_address text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at ON public.platform_audit_logs USING btree (created_at DESC);

GRANT SELECT, INSERT ON public.platform_audit_logs TO authenticated;
GRANT ALL ON public.platform_audit_logs TO service_role;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin le auditoria" ON public.platform_audit_logs
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "Super admin registra auditoria" ON public.platform_audit_logs
  FOR INSERT TO authenticated WITH CHECK (is_super_admin() AND (user_id = auth.uid()));

-- ============ 10. rate_limits (sem policies — acesso só via SECURITY DEFINER) ============
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (user_id, bucket)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: tabela acessada apenas por check_rate_limit() (SECURITY DEFINER).

