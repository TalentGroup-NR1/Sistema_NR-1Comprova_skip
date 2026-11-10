CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'contact_request',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications_super_admin_read" ON public.admin_notifications
  FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE POLICY "admin_notifications_super_admin_update" ON public.admin_notifications
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'nova';

ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_status_check
  CHECK (status IN ('nova','em_contato','convertida','descartada'));

GRANT UPDATE ON public.contact_requests TO authenticated;

CREATE POLICY "contact_requests_super_admin_update" ON public.contact_requests
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.notify_new_contact_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, data)
  VALUES (
    'contact_request',
    'Nova solicitação de demonstração',
    NEW.name || ' — ' || NEW.company || ' (' || NEW.email || ')',
    jsonb_build_object(
      'contact_request_id', NEW.id,
      'name', NEW.name,
      'company', NEW.company,
      'email', NEW.email,
      'phone', NEW.phone,
      'message', NEW.message
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_contact_request ON public.contact_requests;
CREATE TRIGGER trigger_notify_contact_request
  AFTER INSERT ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_contact_request();

CREATE OR REPLACE FUNCTION public.get_admin_notifications(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, type text, title text, message text, data jsonb, is_read boolean, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT n.id, n.type, n.title, n.message, n.data, n.is_read, n.created_at
    FROM public.admin_notifications n
    ORDER BY n.is_read ASC, n.created_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_admin_notification_read(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.admin_notifications
    SET is_read = true, read_at = now()
    WHERE id = p_id AND is_read = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_admin_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.admin_notifications
    SET is_read = true, read_at = now()
    WHERE is_read = false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_notifications(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_admin_notification_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_admin_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_notifications(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_admin_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_admin_notifications_read() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;