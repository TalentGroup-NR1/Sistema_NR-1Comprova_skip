SET check_function_bodies = false;

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

