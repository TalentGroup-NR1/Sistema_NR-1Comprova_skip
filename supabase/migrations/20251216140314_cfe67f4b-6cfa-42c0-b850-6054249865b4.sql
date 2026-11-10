-- Add is_active field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policy: Admin empresa can update profiles from their company (excluding admin roles)
CREATE POLICY "Admin empresa can update own company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin_empresa'::app_role) 
  AND company_id IS NOT NULL 
  AND company_id = get_user_company_id(auth.uid())
  AND NOT is_admin_master(user_id)
  AND NOT has_role(user_id, 'admin_empresa'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin_empresa'::app_role) 
  AND company_id IS NOT NULL 
  AND company_id = get_user_company_id(auth.uid())
  AND NOT is_admin_master(user_id)
  AND NOT has_role(user_id, 'admin_empresa'::app_role)
);

-- RLS Policy: Admin empresa can view user_roles for users in their company
CREATE POLICY "Admin empresa can view own company user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin_empresa'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.company_id = get_user_company_id(auth.uid())
    AND p.company_id IS NOT NULL
  )
);