-- 1. Create get_my_company_id() function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 2. Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view profiles from same company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- 3. Recreate profiles policy without recursion
CREATE POLICY "Users can view profiles from same company"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_admin_master(auth.uid())
  OR (company_id IS NOT NULL AND company_id = get_my_company_id())
);

-- 4. Recreate companies policy without recursion  
CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
TO authenticated
USING (
  is_admin_master(auth.uid())
  OR id = get_my_company_id()
);