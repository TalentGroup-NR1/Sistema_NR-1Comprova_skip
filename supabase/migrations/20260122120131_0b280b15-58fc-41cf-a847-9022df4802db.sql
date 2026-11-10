-- Drop the overly permissive policy that allows any authenticated user to view all active companies
DROP POLICY IF EXISTS "Authenticated users can view active companies" ON public.companies;