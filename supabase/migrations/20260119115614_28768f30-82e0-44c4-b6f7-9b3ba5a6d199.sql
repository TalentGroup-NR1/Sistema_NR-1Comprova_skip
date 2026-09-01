-- Fix RLS policies for profiles table
-- First, let's add proper RLS policies to restrict access to authenticated users from the same company

-- Drop any existing overly permissive policies on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create policy: Users can view profiles from the same company
CREATE POLICY "Users can view profiles from same company"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can always see their own profile
  auth.uid() = user_id
  OR
  -- Admin master can see all profiles
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin_master'
  )
  OR
  -- Users can see profiles from the same company
  (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
);

-- Fix RLS policies for companies table
-- Drop any existing overly permissive policies on companies
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Public companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;

-- Create policy: Authenticated users can view their own company or admin_master can see all
CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- Admin master can see all companies
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin_master'
  )
  OR
  -- Users can see their own company
  id = (
    SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);