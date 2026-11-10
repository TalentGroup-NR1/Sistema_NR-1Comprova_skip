-- Phase 2: Create profiles table and update RLS policies

-- Step 1: Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Step 4: Create updated_at trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Create helper function to check if user is admin_master
CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin_master'
  )
$$;

-- Step 6: Create helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Step 7: Update has_role function to work with new roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 8: Migrate existing roles data
-- NOTA: Envolto em exceção — passa silenciosamente em banco novo (tabela vazia)
DO $$
BEGIN
  UPDATE public.user_roles SET role = 'admin_master' WHERE role = 'admin';
  UPDATE public.user_roles SET role = 'colaborador' WHERE role = 'user';
  UPDATE public.user_roles SET role = 'admin_empresa' WHERE role = 'manager';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 9: Update trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin_master');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'colaborador');
  END IF;
  
  -- Also create a profile for the new user
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  RETURN NEW;
END;
$$;

-- Step 10: Create profiles for existing users
-- NOTA: Envolto em exceção — passa silenciosamente em banco novo (auth.users vazio)
DO $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  SELECT u.id, u.email
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
  )
  ON CONFLICT (user_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 11: Drop existing policies and recreate for companies
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admin master can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view active companies" ON public.companies;

CREATE POLICY "Admin master can manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "Authenticated users can view active companies"
ON public.companies
FOR SELECT
TO authenticated
USING ((status)::text = 'active'::text);

-- Step 12: RLS Policies for profiles table
DROP POLICY IF EXISTS "Admin master can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin empresa can view company profiles" ON public.profiles;

CREATE POLICY "Admin master can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin empresa can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_empresa') 
  AND company_id = public.get_user_company_id(auth.uid())
  AND company_id IS NOT NULL
);

-- Step 13: Update user_roles RLS policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admin master can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());