
-- 1. Table: notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  entity_type TEXT,
  entity_id UUID,
  priority TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index
CREATE INDEX idx_notifications_user_unread 
ON public.notifications(company_id, user_id, is_read, created_at DESC);

-- 3. Priority validation trigger
CREATE OR REPLACE FUNCTION public.validate_notification_priority()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.priority NOT IN ('low', 'normal', 'high') THEN
    NEW.priority := 'normal';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_notification_priority
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.validate_notification_priority();

-- 4. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
  OR user_id = auth.uid()
);

-- 5. RPC: get_user_notifications (notifications + unread comunicados)
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  action_url TEXT,
  priority TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT n.id, n.type, n.title, n.message, n.action_url, n.priority, n.is_read, n.created_at
    FROM notifications n
    WHERE n.user_id = auth.uid()
      AND n.company_id = get_my_company_id()
  )
  UNION ALL
  (
    SELECT 
      c.id,
      'comunicado'::TEXT as type,
      c.titulo::TEXT as title,
      LEFT(c.conteudo, 160)::TEXT as message,
      '/comunicados'::TEXT as action_url,
      CASE WHEN c.is_pinned THEN 'high' ELSE 'normal' END as priority,
      EXISTS (
        SELECT 1 FROM comunicado_leituras cl
        WHERE cl.comunicado_id = c.id AND cl.user_id = auth.uid()
      ) as is_read,
      c.data_publicacao as created_at
    FROM comunicados c
    WHERE c.company_id = get_my_company_id()
      AND c.status = 'publicado'
      AND c.data_publicacao <= now()
  )
  ORDER BY is_read ASC, created_at DESC
  LIMIT p_limit;
$$;

-- 6. RPC: mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

-- 7. RPC: mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid()
    AND company_id = get_my_company_id()
    AND is_read = false;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
