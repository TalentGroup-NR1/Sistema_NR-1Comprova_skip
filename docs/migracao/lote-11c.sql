SET check_function_bodies = false;

-- ============ 6. email_send_state ============
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer PRIMARY KEY DEFAULT 1,
  retry_after_until timestamptz,
  batch_size integer NOT NULL DEFAULT 10,
  send_delay_ms integer NOT NULL DEFAULT 200,
  auth_email_ttl_minutes integer NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_send_state_id_check CHECK (id = 1)
);

GRANT ALL ON public.email_send_state TO service_role;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage send state" ON public.email_send_state
  FOR ALL USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ 7. email_unsubscribe_tokens ============
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens
  FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens
  FOR SELECT USING (auth.role() = 'service_role'::text);
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens
  FOR UPDATE USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- ============ 8. lgpd_audit_logs ============
CREATE TABLE IF NOT EXISTS public.lgpd_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  collaborator_id uuid,
  collaborator_name text,
  requested_by uuid,
  requested_by_email text,
  company_id uuid,
  ip_address text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lgpd_audit_logs_action_check CHECK (action = ANY (ARRAY['export'::text,'delete'::text,'revoke_consent'::text,'grant_consent'::text]))
);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_company ON public.lgpd_audit_logs USING btree (company_id, created_at DESC);

GRANT SELECT ON public.lgpd_audit_logs TO authenticated;
GRANT ALL ON public.lgpd_audit_logs TO service_role;
ALTER TABLE public.lgpd_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read lgpd logs" ON public.lgpd_audit_logs
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR admin_master_scope(company_id)
    OR ((get_my_role() = 'admin_empresa'::app_role) AND (company_id = get_my_company_id()))
  );

