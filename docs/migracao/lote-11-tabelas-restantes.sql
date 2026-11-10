SET check_function_bodies = false;

-- ============================================================
-- LOTE 11 — 13 TABELAS RESTANTES
-- Estrutura + índices + RLS + policies + grants
-- Nenhuma dessas tabelas usa ENUM personalizado.
-- (as policies referenciam as funções is_super_admin(),
--  is_admin_master(), admin_master_scope(), get_my_role(),
--  get_my_company_id() — já criadas no export de segurança)
-- ============================================================

-- ============ 1. admin_notifications ============
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'contact_request'::text,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications USING btree (is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);

GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_notifications_super_admin_read ON public.admin_notifications
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY admin_notifications_super_admin_update ON public.admin_notifications
  FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============ 2. birthday_greeting_acknowledgments ============
CREATE TABLE IF NOT EXISTS public.birthday_greeting_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  greeting_type text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT birthday_greeting_acknowledgments_greeting_type_check
    CHECK (greeting_type = ANY (ARRAY['birthday'::text, 'work_anniversary'::text])),
  CONSTRAINT birthday_greeting_acknowledgment_user_id_year_greeting_type_key
    UNIQUE (user_id, year, greeting_type)
);
CREATE INDEX IF NOT EXISTS idx_bday_ack_user_year ON public.birthday_greeting_acknowledgments USING btree (user_id, year);

GRANT SELECT, INSERT ON public.birthday_greeting_acknowledgments TO authenticated;
GRANT ALL ON public.birthday_greeting_acknowledgments TO service_role;
ALTER TABLE public.birthday_greeting_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own greeting acks" ON public.birthday_greeting_acknowledgments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own greeting acks" ON public.birthday_greeting_acknowledgments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ 3. blog_posts ============
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'NR-1'::text,
  excerpt text NOT NULL,
  content text NOT NULL,
  cover_image_url text,
  pdf_url text,
  status text NOT NULL DEFAULT 'draft'::text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  author_name text DEFAULT 'Talent Group'::text,
  reading_time_min integer DEFAULT 5,
  meta_description text,
  meta_keywords text,
  CONSTRAINT blog_posts_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]))
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts USING btree (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts USING btree (slug);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_posts_public_read ON public.blog_posts
  FOR SELECT USING (status = 'published'::text);
CREATE POLICY blog_posts_super_admin_all ON public.blog_posts
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============ 4. contact_requests ============
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'nova'::text,
  CONSTRAINT contact_requests_status_check CHECK (status = ANY (ARRAY['nova'::text, 'em_contato'::text, 'convertida'::text, 'descartada'::text])),
  CONSTRAINT contact_requests_name_check CHECK (char_length(name) >= 1 AND char_length(name) <= 120),
  CONSTRAINT contact_requests_company_check CHECK (char_length(company) >= 1 AND char_length(company) <= 150),
  CONSTRAINT contact_requests_email_check CHECK (char_length(email) >= 3 AND char_length(email) <= 255),
  CONSTRAINT contact_requests_phone_check CHECK (phone IS NULL OR char_length(phone) <= 30),
  CONSTRAINT contact_requests_message_check CHECK (message IS NULL OR char_length(message) <= 2000)
);

GRANT INSERT ON public.contact_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Super admin can read contact requests" ON public.contact_requests
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY contact_requests_super_admin_update ON public.contact_requests
  FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============ 5. email_send_log ============
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_send_log_status_check CHECK (status = ANY (ARRAY['pending'::text,'sent'::text,'suppressed'::text,'failed'::text,'bounced'::text,'complained'::text,'dlq'::text]))
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log USING btree (message_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);

GRANT ALL ON public.email_send_log TO service_role;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert send log" ON public.email_send_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);
CREATE POLICY "Service role can read send log" ON public.email_send_log
  FOR SELECT USING (auth.role() = 'service_role'::text);
CREATE POLICY "Service role can update send log" ON public.email_send_log
  FOR UPDATE USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

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

-- ============ 13. user_preferences ============
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- FIM DO LOTE 11
