CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'NR-1',
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_name TEXT DEFAULT 'Talent Group',
  reading_time_min INTEGER DEFAULT 5,
  meta_description TEXT,
  meta_keywords TEXT
);

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "blog_posts_super_admin_all" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "blog_bucket_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog');

CREATE POLICY "blog_bucket_super_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog' AND public.is_super_admin());

CREATE POLICY "blog_bucket_super_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'blog' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'blog' AND public.is_super_admin());

CREATE POLICY "blog_bucket_super_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'blog' AND public.is_super_admin());