-- =====================================================================
-- MIGRAÇÃO — LOTE 1: TABELAS BASE (17 tabelas, sem dependências internas)
-- Gerado a partir do schema atual de produção.
-- Ordem: enums -> tabelas -> constraints -> índices -> grants.
-- Observação: RLS e políticas NÃO estão incluídas neste lote (virão à parte).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ENUM necessário (user_roles)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin', 'manager', 'user', 'admin_master', 'admin_empresa',
      'analista_rh', 'gestor_departamento', 'colaborador', 'super_admin'
    );
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 1. companies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(255) NOT NULL,
  cnpj character varying(18) NOT NULL,
  contact_person character varying(255),
  email character varying(255),
  status character varying(20) DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  logo_url text,
  logo_upload_date timestamp with time zone,
  primary_color text DEFAULT '#1E5A99'::text,
  secondary_color text DEFAULT '#333333'::text,
  accent_color text DEFAULT '#FFFFFF'::text,
  brand_name text,
  brand_logo_url text,
  brand_primary_color text DEFAULT '#C8102E'::text,
  brand_favicon_url text,
  is_internal boolean DEFAULT false,
  telefone text,
  segmento text,
  terms_accepted_at timestamp with time zone,
  terms_accepted_ip text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies USING btree (status);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies USING btree (cnpj);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

-- ---------------------------------------------------------------------
-- 2. cbo_ocupacoes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cbo_ocupacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT cbo_ocupacoes_pkey PRIMARY KEY (id),
  CONSTRAINT cbo_ocupacoes_codigo_key UNIQUE (codigo)
);
CREATE INDEX IF NOT EXISTS idx_cbo_titulo ON public.cbo_ocupacoes USING btree (titulo);

GRANT SELECT ON public.cbo_ocupacoes TO authenticated;
GRANT ALL ON public.cbo_ocupacoes TO service_role;

-- ---------------------------------------------------------------------
-- 3. user_roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ---------------------------------------------------------------------
-- 4. user_preferences
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  theme_color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_key UNIQUE (user_id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

-- ---------------------------------------------------------------------
-- 5. tasks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority text DEFAULT 'media'::text NOT NULL,
  status text DEFAULT 'pendente'::text NOT NULL,
  category text,
  "position" integer DEFAULT 0 NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT tasks_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200))),
  CONSTRAINT tasks_description_check CHECK (((description IS NULL) OR (char_length(description) <= 1000))),
  CONSTRAINT tasks_category_check CHECK (((category IS NULL) OR (char_length(category) <= 80))),
  CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text]))),
  CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'concluida'::text])))
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_position ON public.tasks USING btree (user_id, "position");
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON public.tasks USING btree (user_id, status, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

-- ---------------------------------------------------------------------
-- 6. rate_limits  (PK composta, acesso apenas via função/service_role)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  window_start timestamp with time zone DEFAULT now() NOT NULL,
  request_count integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT rate_limits_pkey PRIMARY KEY (user_id, bucket)
);

GRANT ALL ON public.rate_limits TO service_role;

-- ---------------------------------------------------------------------
-- 7. admin_notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  type text DEFAULT 'contact_request'::text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  read_at timestamp with time zone,
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications USING btree (is_read);

GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

-- ---------------------------------------------------------------------
-- 8. platform_audit_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid DEFAULT auth.uid() NOT NULL,
  user_email text,
  action text NOT NULL,
  target_company_id uuid,
  target_company_name text,
  ip_address text,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT platform_audit_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at ON public.platform_audit_logs USING btree (created_at DESC);

GRANT SELECT, INSERT ON public.platform_audit_logs TO authenticated;
GRANT ALL ON public.platform_audit_logs TO service_role;

-- ---------------------------------------------------------------------
-- 9. lgpd_audit_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lgpd_audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  action text NOT NULL,
  collaborator_id uuid,
  collaborator_name text,
  requested_by uuid,
  requested_by_email text,
  company_id uuid,
  ip_address text,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT lgpd_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT lgpd_audit_logs_action_check CHECK ((action = ANY (ARRAY['export'::text, 'delete'::text, 'revoke_consent'::text, 'grant_consent'::text])))
);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_company ON public.lgpd_audit_logs USING btree (company_id, created_at DESC);

GRANT SELECT ON public.lgpd_audit_logs TO authenticated;
GRANT ALL ON public.lgpd_audit_logs TO service_role;

-- ---------------------------------------------------------------------
-- 10. security_rate_limit_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_rate_limit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  bucket text NOT NULL,
  max_req integer NOT NULL,
  window_secs integer NOT NULL,
  request_count integer NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT security_rate_limit_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_security_rl_logs_user_time ON public.security_rate_limit_logs USING btree (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_rl_logs_bucket_time ON public.security_rate_limit_logs USING btree (bucket, occurred_at DESC);

GRANT SELECT ON public.security_rate_limit_logs TO authenticated;
GRANT ALL ON public.security_rate_limit_logs TO service_role;

-- ---------------------------------------------------------------------
-- 11. email_send_log
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT email_send_log_pkey PRIMARY KEY (id),
  CONSTRAINT email_send_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])))
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log USING btree (message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);

GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;

-- ---------------------------------------------------------------------
-- 12. email_send_state  (tabela singleton: id = 1)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer DEFAULT 1 NOT NULL,
  retry_after_until timestamp with time zone,
  batch_size integer DEFAULT 10 NOT NULL,
  send_delay_ms integer DEFAULT 200 NOT NULL,
  auth_email_ttl_minutes integer DEFAULT 15 NOT NULL,
  transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT email_send_state_pkey PRIMARY KEY (id),
  CONSTRAINT email_send_state_id_check CHECK ((id = 1))
);
INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT ALL ON public.email_send_state TO service_role;

-- ---------------------------------------------------------------------
-- 13. email_unsubscribe_tokens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  token text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  used_at timestamp with time zone,
  CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token),
  CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

-- ---------------------------------------------------------------------
-- 14. suppressed_emails
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id),
  CONSTRAINT suppressed_emails_email_key UNIQUE (email),
  CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])))
);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);

GRANT SELECT ON public.suppressed_emails TO authenticated;
GRANT ALL ON public.suppressed_emails TO service_role;

-- ---------------------------------------------------------------------
-- 15. blog_posts  (leitura pública dos publicados)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  category text DEFAULT 'NR-1'::text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  cover_image_url text,
  pdf_url text,
  status text DEFAULT 'draft'::text NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  author_name text DEFAULT 'Talent Group'::text,
  reading_time_min integer DEFAULT 5,
  meta_description text,
  meta_keywords text,
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
  CONSTRAINT blog_posts_slug_key UNIQUE (slug),
  CONSTRAINT blog_posts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts USING btree (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts USING btree (slug);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

-- ---------------------------------------------------------------------
-- 16. contact_requests  (formulário público da landing page)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'nova'::text NOT NULL,
  CONSTRAINT contact_requests_pkey PRIMARY KEY (id),
  CONSTRAINT contact_requests_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))),
  CONSTRAINT contact_requests_company_check CHECK (((char_length(company) >= 1) AND (char_length(company) <= 150))),
  CONSTRAINT contact_requests_email_check CHECK (((char_length(email) >= 3) AND (char_length(email) <= 255))),
  CONSTRAINT contact_requests_phone_check CHECK (((phone IS NULL) OR (char_length(phone) <= 30))),
  CONSTRAINT contact_requests_message_check CHECK (((message IS NULL) OR (char_length(message) <= 2000))),
  CONSTRAINT contact_requests_status_check CHECK ((status = ANY (ARRAY['nova'::text, 'em_contato'::text, 'convertida'::text, 'descartada'::text])))
);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests USING btree (status);

GRANT INSERT ON public.contact_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;

-- ---------------------------------------------------------------------
-- 17. birthday_greeting_acknowledgments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.birthday_greeting_acknowledgments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  year integer NOT NULL,
  greeting_type text NOT NULL,
  acknowledged_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT birthday_greeting_acknowledgments_pkey PRIMARY KEY (id),
  CONSTRAINT birthday_greeting_acknowledgment_user_id_year_greeting_type_key UNIQUE (user_id, year, greeting_type),
  CONSTRAINT birthday_greeting_acknowledgments_greeting_type_check CHECK ((greeting_type = ANY (ARRAY['birthday'::text, 'work_anniversary'::text])))
);
CREATE INDEX IF NOT EXISTS idx_bday_ack_user_year ON public.birthday_greeting_acknowledgments USING btree (user_id, year);

GRANT SELECT, INSERT ON public.birthday_greeting_acknowledgments TO authenticated;
GRANT ALL ON public.birthday_greeting_acknowledgments TO service_role;

-- =====================================================================
-- FIM DO LOTE 1
-- Próximo passo sugerido: habilitar RLS + políticas destas 17 tabelas
-- antes de avançar para o Lote 2.
-- =====================================================================
