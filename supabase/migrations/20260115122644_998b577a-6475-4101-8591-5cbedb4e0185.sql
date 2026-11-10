-- Add user_id column to colaboradores to link with auth users
ALTER TABLE public.colaboradores 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_colaboradores_user_id ON public.colaboradores(user_id);

-- Add must_change_password flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Create RLS policy to allow colaboradores to view their own record
CREATE POLICY "Colaboradores can view their own record"
ON public.colaboradores
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_master(auth.uid())
  OR (
    public.get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh', 'gestor_departamento')
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

-- Create policy to allow user to view their own feedback cycles
CREATE POLICY "Users can view own feedback cycles via colaborador link"
ON public.feedback_cycles
FOR SELECT
TO authenticated
USING (
  colaborador_id IN (
    SELECT id FROM public.colaboradores WHERE user_id = auth.uid()
  )
  OR public.is_admin_master(auth.uid())
  OR (
    public.get_user_role(auth.uid()) IN ('admin_empresa', 'analista_rh', 'gestor_departamento')
    AND company_id = public.get_user_company_id(auth.uid())
  )
);