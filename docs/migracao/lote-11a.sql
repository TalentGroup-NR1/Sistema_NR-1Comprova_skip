SET check_function_bodies = false;

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

