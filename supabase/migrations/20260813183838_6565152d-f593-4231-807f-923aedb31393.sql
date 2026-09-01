CREATE OR REPLACE FUNCTION public.my_company_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.status::text
  FROM public.profiles p
  JOIN public.companies c ON c.id = p.company_id
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.my_company_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_company_status() TO authenticated;