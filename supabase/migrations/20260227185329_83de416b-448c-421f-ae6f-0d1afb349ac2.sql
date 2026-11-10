
-- Fix 1: Restrict pulse_access_logs INSERT to authenticated admins
DROP POLICY IF EXISTS "System can insert access logs" ON public.pulse_access_logs;
CREATE POLICY "Admins can insert access logs" ON public.pulse_access_logs
FOR INSERT TO authenticated
WITH CHECK (
  admin_id = auth.uid() 
  AND get_my_role() IN ('admin_master', 'admin_empresa', 'analista_rh')
);

-- Fix 2: Add missing DELETE policy on notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());
