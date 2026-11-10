SET check_function_bodies = false;

-- ============ 11. security_rate_limit_logs ============
CREATE TABLE IF NOT EXISTS public.security_rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  bucket text NOT NULL,
  max_req integer NOT NULL,
  window_secs integer NOT NULL,
  request_count integer NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_rl_logs_user_time ON public.security_rate_limit_logs USING btree (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_rl_logs_bucket_time ON public.security_rate_limit_logs USING btree (bucket, occurred_at DESC);

GRANT SELECT ON public.security_rate_limit_logs TO authenticated;
GRANT ALL ON public.security_rate_limit_logs TO service_role;
ALTER TABLE public.security_rate_limit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master reads rate limit audit" ON public.security_rate_limit_logs
  FOR SELECT TO authenticated USING (is_admin_master(auth.uid()));

-- ============ 12. suppressed_emails ============
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);

GRANT ALL ON public.suppressed_emails TO service_role;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails
  FOR SELECT USING (auth.role() = 'service_role'::text);
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails
  FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);

